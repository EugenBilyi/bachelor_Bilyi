const { useEffect, useState } = React;


function applyFilters() {
    let dodavatelFilter = document.getElementById('searchBarDodavatel').value.toUpperCase();
    let dokladFilter = document.getElementById('searchBarDoklad').value.toUpperCase();
    let poznamkaFilter = document.getElementById('searchBarPoznamka').value.toUpperCase();
    let dateFilter = document.getElementById('searchBarDate').value;

    let items = document.querySelectorAll('.tableBlock');

    items.forEach(item => {
        let supplier = (item.querySelector('.dodavatelFilter').textContent || item.querySelector('.dodavatelFilter').innerText).toUpperCase();
        let document_number = (item.querySelector('.dokladFilter').textContent || item.querySelector('.dokladFilter').innerText).toUpperCase();
        let note = (item.querySelector('.poznamkaFilter').textContent || item.querySelector('.poznamkaFilter').innerText).toUpperCase();
        let itemDate = item.querySelector('.dateFilter').getAttribute('data-date');

        // Проверяем соответствие всех фильтров
        let matchesDodavatel = supplier.includes(dodavatelFilter);
        let matchesDoklad = document_number.includes(dokladFilter);
        let matchesPoznamka = note.includes(poznamkaFilter);
        let matchesDate = !dateFilter || itemDate.startsWith(dateFilter);

        if (matchesDodavatel && matchesDoklad && matchesPoznamka && matchesDate) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    });
}
function App(){
    const [items, setItems] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [arrowDirection, setArrowDirection] = React.useState(true);
    const [sortDodavatel, setSortDodavatel] = React.useState(true);
    const [sortDoklad, setSortDoklad] = React.useState(true);
    const [sortPrice, setSortPrice] = React.useState(true);
    const [sortPoznamka, setSortPoznamka] = React.useState(true);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/assets/empty_profile_logo.jpg'
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
        let isMounted = true;
        setIsLoading(true);
        setError(null);
    
        const loadData = async () => {
            try {
                const userData = localStorage.getItem('user');
                let user;
                if (userData) {
                    try {
                        user = JSON.parse(userData);
                    } catch (e) {
                        console.error('Error parsing user data:', e);
                        localStorage.removeItem('user');
                    }
                }
    
                if (!user) {
                    throw new Error("Používateľ nie je prihlásený.");
                }
    
                const data = await fetchWithRetry('/naskladnenie_api', 3);
    
                if (isMounted) {
                    setItems(data);
                }
            } catch (err) {
                console.error("Chyba pri načítaní údajov:", err);
                if (isMounted) setError("Chyba pri načítaní údajov. Skúste to znova.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
    
        loadData();
    
        return () => { isMounted = false; };
    }, []);

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
    }, []);
    

    const toggleArrowDirection = () => {
        setArrowDirection(!arrowDirection);
        sortItemsByDate();
    };

    const toggleSortDodavatel = () => {
        setSortDodavatel(!sortDodavatel);
        sortItemsByDodavatel();
    };

    const toggleSortDoklad = () => {
        setSortDoklad(!sortDoklad);
        sortItemsByDoklad();
    };

    const toggleSortPrice = () => {
        setSortPrice(!sortPrice);
        sortItemsByPrice();
    };

    const toggleSortPoznamka = () => {
        setSortPoznamka(!sortPoznamka);
        sortItemsByPoznamka();
    };

    const sortItemsByDate = () => {
        const sortedItems = [...items].sort((a, b) => 
            arrowDirection 
                ? new Date(a.date) - new Date(b.date) 
                : new Date(b.date) - new Date(a.date)
        );
        setItems(sortedItems);
    };

    const sortItemsByDodavatel = () => {
        const sortedItems = [...items].sort((a, b) => {
            const supplierA = a.supplier ? a.supplier.toLowerCase() : ""; 
            const supplierB = b.supplier ? b.supplier.toLowerCase() : "";
    
            // Если обе строки пустые - порядок не меняем
            if (!supplierA && !supplierB) return 0;
    
            // Если одна из строк пустая, она идет в конец при сортировке по возрастанию
            if (!supplierA) return sortDodavatel ? 1 : -1;
            if (!supplierB) return sortDodavatel ? -1 : 1;
    
            return sortDodavatel ? supplierA.localeCompare(supplierB) : supplierB.localeCompare(supplierA);
        });
    
        setItems(sortedItems);
    };
    
    

    const sortItemsByDoklad = () => {
        const sortedItems = [...items].sort((a, b) => {
            const numA = a.document_number ? parseInt(a.document_number, 10) : Number.MAX_SAFE_INTEGER;
            const numB = b.document_number ? parseInt(b.document_number, 10) : Number.MAX_SAFE_INTEGER;
    
            return sortDoklad ? numA - numB : numB - numA;
        });
        setItems(sortedItems);
    };
    
    

    const sortItemsByPoznamka = () => {
        const sortedItems = [...items].sort((a, b) => {
            const noteA = a.note ? a.note : "";
            const noteB = b.note ? b.note : "";
    
            if (!noteA && !noteB) return 0;
    
            if (!noteA) return sortPoznamka ? 1 : -1;
            if (!noteB) return sortPoznamka ? -1 : 1;
    
            return sortPoznamka ? noteA.localeCompare(noteB) : noteB.localeCompare(noteA);
        });
        setItems(sortedItems);
    };
    

    const sortItemsByPrice = () => {
        const sortedItems = [...items].sort((a, b) => {
            if (!sortPrice) {
                return parseFloat(a.cenadph) - parseFloat(b.cenadph);
            } else {
                return parseFloat(b.cenadph) - parseFloat(a.cenadph);
            }
        });
        setItems(sortedItems);
    };

    const handleExportCSV = () => {
        const userData = localStorage.getItem('user');
        const user = userData ? JSON.parse(userData) : null;
    
        if (!user) {
            setErrorMessage('Unauthorized user');
            return;
        }
    
        const headers = ["Datum", "Dodávateľ", "Čislo dokladu", "Cena s DPH", "Poznamka"];
        const rows = items.map(item => [
            new Date(item.date).toLocaleString('sk-SK', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            }).replace(',', ''),  // Форматируем дату в DD.MM.YYYY HH:mm:ss
            item.supplier,
            item.document_number,
            item.cenadph ? `${item.cenadph}€` : "",  // Добавляем €
            item.note || ""  // Оставляем пустую строку, если null/undefined
        ]);
    
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
        // Задаем ширину колонок
        const columnWidths = [
            { wch: 20 },  // Datum
            { wch: 25 },  // Dodávateľ
            { wch: 15 },  // Čislo dokladu
            { wch: 12 },  // Cena s DPH
            { wch: 30 },  // Poznamka
        ];
        ws['!cols'] = columnWidths;
    
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Naskladnenia');
        XLSX.writeFile(wb, 'Naskladnenia.xlsx');
    };

    const handleDeleteNaskladnenie = async (id) => {
        const userData = localStorage.getItem('user');
        const user = userData ? JSON.parse(userData) : null;
    
        if (!user) {
            setErrorMessage('Unauthorized user');
            return;
        }
    
        if (!window.confirm('Naozaj chcete odstrániť toto naskladnenie?')) {
            return;
        }
    
        try {
            const response = await fetch('/delete_naskladnenie', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.email}`
                },
                body: JSON.stringify({ naskladnenie_id: id })
            });
    
            const result = await response.json();
            if (result.success) {
                setItems(items.filter(item => item.id !== id));
            } else {
                setErrorMessage(`Chyba pri odstraňovaní: ${result.error}`);
            }
        } catch (error) {
            setErrorMessage(`Chyba pri odstraňovaní: ${error.message}`);
        }
    };

    const isWithin30Days = (dateString) => {
        const today = new Date();
        const itemDate = new Date(dateString);
        const diffTime = today - itemDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
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
                        <li><a href = "#">ÚČTY</a></li>
                        <li className = 'sklady'><a href = "/skladove_karty">SKLADY</a>
                            <ul>
                                <li><a href = "/skladove_karty">Skladové karty</a></li>
                                <li><a href = "/categories">Kategórie skladových kariet</a></li>
                                <li className="current"><a href = "/naskladnenie">Naskladnenie</a></li>
                                <li><a href = "/inventury">Inventúry</a></li>
                            </ul>
                        </li>
                        <li><a href = "#">FAKTURÁCIE</a></li>
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
                        <li><a href="/skladove_karty">Skladové karty</a></li>
                        <li><a href="/categories">Kategórie skladových kariet</a></li>
                        <li className="current"><a href="/naskladnenie">Naskladnenie</a></li>
                        <li><a href="/inventury">Inventúry</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <p>Naskladnenie</p>
                    <button onClick={() => window.location.href = '/noveNaskladnenie'}>
                        <i className="fa-solid fa-plus"></i>Nové naskladnenie
                    </button>
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
                                        <p onClick={toggleArrowDirection}>Datum
                                            <i className={arrowDirection ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down'}></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col2">
                                    <div className="nameCol">
                                        <p onClick={toggleSortDodavatel}>Dodávateľ
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col3">
                                    <div className="nameCol">
                                        <p onClick={toggleSortDoklad}>Čislo dokladu
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col4">
                                    <div className="nameCol">
                                        <p onClick={toggleSortPrice}>Cena s DPH
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col5">
                                    <div className="nameCol">
                                        <p onClick={toggleSortPoznamka}>Poznamka
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col6">
                                    <div className="nameCol">Akcie</div>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="col1">
                                    <div className="blockInput">
                                        <input className="searchInput" type="date" name="searchBarDate" id="searchBarDate" onChange={applyFilters}></input>
                                    </div>
                                </td>
                                <td className="col2">
                                    <div className="blockInput">
                                        <i className="searchIcon fa-solid fa-magnifying-glass"></i>
                                        <input className="searchInput" type="text" name="searchBar" id="searchBarDodavatel" onChange={applyFilters}></input>
                                    </div>
                                </td>
                                <td className="col3">
                                    <div className="blockInput">
                                        <i className="searchIcon fa-solid fa-magnifying-glass"></i>
                                        <input className="searchInput" type="text" name="searchBar" id="searchBarDoklad" onChange={applyFilters}></input>
                                    </div>
                                </td>
                                <td className="col4"></td>
                                <td className="col5">
                                    <div className="blockInput">
                                        <i className="searchIcon fa-solid fa-magnifying-glass"></i>
                                        <input className="searchInput" type="text" name="searchBar" id="searchBarPoznamka" onChange={applyFilters}></input>
                                    </div>
                                </td>
                                <td className="col6"></td>
                            </tr>
                            {items.map(item => (
                                <tr key={item.id} className="tableBlock">
                                    <td className='dateFilter' data-date={new Date(item.date).toISOString().split('T')[0]}>
                                        {new Intl.DateTimeFormat('sk-SK', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit', 
                                            second: '2-digit',
                                            timeZone: 'UTC'
                                        }).format(new Date(item.date))}
                                    </td>
                                    <td className='dodavatelFilter'>{item.supplier}</td>
                                    <td className='dokladFilter'>{item.document_number}</td>
                                    <td>{item.cenadph}€</td>
                                    <td className='poznamkaFilter'>{item.note}</td>
                                    <td>
                                        {isWithin30Days(item.date) && (
                                            <>
                                                <i className="fa-solid fa-pencil" 
                                                    onClick={() => {localStorage.setItem("naskladnenie_id", item.id);
                                                    window.location.href = "/opravitNaskladnenie";}}>
                                                </i>
                                                <i className="fa-solid fa-xmark" onClick={() => handleDeleteNaskladnenie(item.id)}></i>
                                            </>
                                        )}
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