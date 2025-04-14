const { useEffect, useState } = React;

function App(){
    const [inventories, setInventories] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [sortByField, setSortByField] = useState(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [searchDate, setSearchDate] = useState('');
    const [searchStol, setSearchStol] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/avatars/empty_profile_logo.jpg'
    });

    const fetchWithRetry = async (url, attempts = 3) => {
        for (let i = 0; i < attempts; i++) {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                return await res.json();
            } catch (err) {
                console.warn(`Fetch failed (${i + 1}/${attempts}): ${url}`, err);
                if (i === attempts - 1) throw err;
            }
        }
    }; 

    useEffect(() => {
        const loadProfile = async () => {
            setIsLoading(true);
            setError(null);
    
            try {
                const data = await fetchWithRetry('/api/profile_data');
                if (data.success) {
                    setProfile(data.profile);
                } else {
                    throw new Error(data.error || 'Chyba pri načítaní profilu');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
    
        loadProfile();

        const fetchUctenky = async () => {
            try {
                const data = await fetchWithRetry('/api/get_uctenky');
                setInventories(data);
            } catch (err) {
                console.error("Chyba pri načítaní účteniek:", err);
                setError("Nepodarilo sa načítať účtenky.");
            }
        };
    
        fetchUctenky();    
    }, []);

    const handleExportCSV = () => {
        const filtered = getFilteredInventories();
    
        if (!filtered.length) {
            setErrorMessage('Nie sú dostupné žiadne údaje na export.');
            return;
        }
    
        const headers = ["Číslo účtu", "Vytvorené", "Konečná cena", "Stôl", "Typ"];
        const rows = filtered.map(item => [
            item.cislo_uctu,
            formatDate(item.datum),
            `${item.cena.toFixed(2)} €`,
            item.stol,
            "Účtenka"
        ]);
    
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [
            { wch: 15 }, // Číslo účtu
            { wch: 25 }, // Dátum
            { wch: 15 }, // Cena
            { wch: 10 }, // Stôl
            { wch: 12 }  // Typ
        ];
    
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Účtenky');
        XLSX.writeFile(wb, 'Účtenky.xlsx');
    };

    const getSortedInventories = () => {
        const sorted = [...inventories];
        if (!sortByField) return sorted;
    
        return sorted.sort((a, b) => {
            let valA = a[sortByField];
            let valB = b[sortByField];
    
            if (sortByField === 'datum') {
                valA = new Date(valA);
                valB = new Date(valB);
            } else if (sortByField === 'cena') {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            } else {
                valA = valA?.toString().toLowerCase();
                valB = valB?.toString().toLowerCase();
            }
    
            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    };

    const getFilteredInventories = () => {
        return getSortedInventories().filter(item => {
            const matchesText = item.cislo_uctu.toLowerCase().includes(searchText.toLowerCase());
            const matchesDate = !searchDate || item.datum.slice(0, 10) === searchDate;
            const matchesStol = !searchStol || item.stol === searchStol;
            return matchesText && matchesDate && matchesStol;
        });
    };    
    
    const formatDate = (dateString) => {
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
    };    

    const handleSort = (field) => {
        if (sortByField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortByField(field);
            setSortAsc(true);
        }
    };    

    const handleLogout = async () => {
        try {
            const res = await fetch("/logout", {
                method: "POST"
            });
            const data = await res.json();
    
            if (data.success) {
                localStorage.clear();
                window.location.href = "/authorization_page";
            } else {
                alert("Odhlásenie zlyhalo.");
            }
        } catch (err) {
            console.error("Chyba pri odhlasovaní:", err);
            alert("Nastala chyba pri odhlasovaní.");
        }
    };

    if (isLoading) {
        return (
            <div className="loadingContainer">
                <div className="spinner"></div>
                <p>Načítanie údajov...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="errorContainer">
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Skúsiť znova</button>
            </div>
        );
    }

    return(
        <div>
            <header>
                <a href = "/skladove_karty" className = "logo">Skladový systém</a>

                <nav>
                    <ul>
                        <li className = 'ucty'><a href = "/uctenky">ÚČTY</a>
                            <ul>
                                <li className="current"><a href="/uctenky">Účtenky</a></li>
                            </ul>
                        </li>
                        <li><a href = "/skladove_karty">SKLADY</a>
                            <ul>
                                <li><a href = "/skladove_karty">Skladové karty</a></li>
                                <li><a href = "/categories">Kategórie skladových kariet</a></li>
                                <li><a href = "/naskladnenie">Naskladnenie</a></li>
                                <li><a href = "/inventury">Inventúry</a></li>
                            </ul>
                        </li>
                        <li><a href = "/faktury">FAKTURÁCIE</a>
                            <ul>
                                <li><a href="/faktury">Faktúry</a></li>
                            </ul>
                        </li>
                        <li className="user-menu">
                            <a href="/profile">
                                <img src={profile.avatar_path} alt="avatar" />
                                <label>{profile.username}</label>
                                <i className="fa-solid fa-caret-down"></i>
                            </a>
                            <ul>
                                <li><a href="/profile">Môj profil</a></li>
                                <li><a onClick={handleLogout}>Odhlásiť sa</a></li>
                            </ul>
                        </li>
                    </ul>
                </nav>
            </header>
            <div>
                <div className="sideBar">
                    <ul>
                        <li className="current"><a href="/uctenky">Účtenky</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <p>Účtenky</p>
                </div>
            </div>
            <div className="mainPlace">
                <div className="tableCategories">
                    <table>
                        <thead>
                            <tr>
                                <td colSpan="6">
                                    <div className="buttonContainer">
                                        <button onClick={handleExportCSV}>Export do .csv</button>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className="col1">
                                    <div className="nameCol">
                                        <p onClick={() => handleSort('cislo_uctu')}>Číslo účtu
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col2">
                                    <div className="nameCol">
                                        <p onClick={() => handleSort('datum')}>Vytvorené
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col3">
                                    <div className="nameCol">
                                        <p onClick={() => handleSort('cena')}>Konečná cena
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col4">
                                    <div className="nameCol">
                                        <p onClick={() => handleSort('stol')}>Stôl
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col5">
                                    <div className="nameCol">
                                        <p>Typ</p>
                                    </div>
                                </td>
                                <td className="col6">
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="blockInput">
                                        <i className="searchIcon fa-solid fa-magnifying-glass"></i>
                                        <input
                                            className="searchInput"
                                            type="text"
                                            placeholder="Vyhľadať"
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                        />
                                    </div>
                                </td>
                                <td>
                                    <div className="blockInput">
                                        <input
                                            className="searchInput"
                                            type="date"
                                            value={searchDate}
                                            onChange={(e) => setSearchDate(e.target.value)}
                                        />
                                    </div>
                                </td>
                                <td>

                                </td>
                                <td>
                                <select value={searchStol} onChange={(e) => setSearchStol(e.target.value)}>
                                    <option value="">Vyberte</option>
                                    <option value="stol1">Stôl 1</option>
                                    <option value="stol2">Stôl 2</option>
                                    <option value="stol3">Stôl 3</option>
                                    <option value="stol4">Stôl 4</option>
                                    <option value="stol5">Stôl 5</option>
                                    <option value="stol6">Stôl 6</option>
                                    <option value="stol7">Stôl 7</option>
                                    <option value="stol8">Stôl 8</option>
                                    <option value="stol9">Stôl 9</option>
                                </select>
                                </td>
                                <td></td>
                                <td></td>
                            </tr>
                        </thead>
                        <tbody>
                            {getFilteredInventories().map(item => (
                                <tr key={item.id} className="tableBlock">
                                    <td>{item.cislo_uctu}</td>
                                    <td className="dateFilter" data-date={item.datum.slice(0, 10)}>
                                        {formatDate(item.datum)}
                                    </td>
                                    <td>{item.cena.toFixed(2)} €</td>
                                    <td>{item.stol}</td>
                                    <td>Účtenka</td>
                                    <td>
                                        <i className="fa-solid fa-circle-info" onClick={() => {
                                            localStorage.setItem("predaj_id", item.id);
                                            window.location.href = "/infoUctenky";
                                        }}>
                                        </i>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

ReactDOM.render(<App />, document.getElementById('app'));