const { useEffect, useState } = React;

function applyFilters() {
    let poznamkaFilter = document.getElementById('searchBarPoznamka').value.toUpperCase();
    let dateFilter = document.getElementById('searchBarDate').value; // Получаем дату из input

    let items = document.querySelectorAll('.tableBlock');

    items.forEach(item => {
        let note = (item.querySelector('.poznamkaFilter').textContent || item.querySelector('.poznamkaFilter').innerText).toUpperCase();
        let itemDate = item.querySelector('.dateFilter').getAttribute('data-date');

        // Проверяем соответствие всех фильтров
        let matchesPoznamka = note.includes(poznamkaFilter);
        let matchesDate = !dateFilter || itemDate.startsWith(dateFilter);

        // Если элемент удовлетворяет всем фильтрам, показываем его, иначе скрываем
        if (matchesPoznamka && matchesDate) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    });
}


function App(){
    const [arrowDirection, setArrowDirection] = React.useState(true);
    const [inventories, setInventories] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [sortPrice, setSortPrice] = useState(true);
    const [sortPoznamka, setSortPoznamka] = useState(true);

    useEffect(() => {
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
            return;
        }
        fetch('/inventury_api', {
            headers: {
                'Authorization': `Bearer ${user.email}`
            }
        })
        .then(response => response.json())
        .then(data => setInventories(data))
        .catch(error => console.error('Error fetching inventories:', error));
    }, []);

    const toggleArrowDirection = () => {
        setArrowDirection(!arrowDirection);
        sortItemsByDate();
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
        const sortedItems = [...inventories].sort((a, b) => 
            arrowDirection 
                ? new Date(a.date) - new Date(b.date) 
                : new Date(b.date) - new Date(a.date)
        );
        setInventories(sortedItems);
    };

    const sortItemsByPrice = () => {
        const sortedItems = [...inventories].sort((a, b) => {
            return sortPrice 
                ? parseFloat(a.cenaDPH) - parseFloat(b.cenaDPH) 
                : parseFloat(b.cenaDPH) - parseFloat(a.cenaDPH);
        });
        setInventories(sortedItems);
    };

    const sortItemsByPoznamka = () => {
        const sortedItems = [...inventories].sort((a, b) => {
            const noteA = a.note || "";
            const noteB = b.note || "";

            if (!noteA && !noteB) return 0;
            if (!noteA) return sortPoznamka ? 1 : -1;
            if (!noteB) return sortPoznamka ? -1 : 1;

            return sortPoznamka ? noteA.localeCompare(noteB) : noteB.localeCompare(noteA);
        });
        setInventories(sortedItems);
    };

    const handleDeleteInventura = async (id) => {
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

    const handleExportCSV = () => {
        if (!inventories.length) {
            setErrorMessage('Nie sú dostupné žiadne údaje na export.');
            return;
        }

        const headers = ["Dátum", "Cena s DPH", "Poznámka"];
        const rows = inventories.map(item => [
            new Date(item.date).toLocaleString('sk-SK', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            }).replace(',', ''),  
            item.cenaDPH ? `${item.cenaDPH}€` : "",  
            item.note || ""  
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 30 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventúry');
        XLSX.writeFile(wb, 'Inventúry.xlsx');
    };

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
                                <li><a href = "/naskladnenie">Naskladnenie</a></li>
                                <li className="current"><a href = "/inventury">Inventúry</a></li>
                            </ul>
                        </li>
                        <li><a href = "#">FAKTURÁCIE</a></li>
                    </ul>
                </nav>
            </header>
            <div>
                <div className="sideBar">
                    <ul>
                        <li><a href="/skladove_karty">Skladové karty</a></li>
                        <li><a href="/categories">Kategórie skladových kariet</a></li>
                        <li><a href="/naskladnenie">Naskladnenie</a></li>
                        <li className="current"><a href="/inventury">Inventúry</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <p>Inventúry</p>
                    <button onClick={() => window.location.href = '/novaInventura'}>
                        <i className="fa-solid fa-plus"></i>Nová inventúra
                    </button>
                </div>
            </div>
            <div className="mainPlace">
                <div className="tableCategories">
                    <table>
                        <thead>
                            <tr>
                                <td colSpan="4">
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
                                        <p onClick={toggleSortPrice}>Cena s DPH
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col3">
                                    <div className="nameCol">
                                        <p onClick={toggleSortPoznamka}>Poznamka
                                            <i className="fa-solid fa-sort"></i>
                                        </p>
                                    </div>
                                </td>
                                <td className="col4">
                                    <div className="nameCol">Akcie</div>
                                </td>
                            </tr>
                            <tr>
                                <td className="col1">
                                    <div className="blockInput">
                                        <input className="searchInput" type="date" name="searchBarDate" id="searchBarDate" onChange={applyFilters}></input>
                                    </div>
                                </td>
                                <td className="col2"></td>
                                <td className="col3">
                                    <div className="blockInput">
                                        <i className="searchIcon fa-solid fa-magnifying-glass"></i>
                                        <input className="searchInput" type="text" name="searchBar" id="searchBarPoznamka" onChange={applyFilters}></input>
                                    </div>
                                </td>
                                <td className="col4"></td>
                            </tr>
                        </thead>
                        <tbody>
                            {inventories.map(item => (
                                <tr key={item.id} className="tableBlock">
                                    <td className="col1 dateFilter" data-date={new Date(item.date).toISOString().split('T')[0]}>
                                        {new Intl.DateTimeFormat('sk-SK', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit', 
                                            second: '2-digit'
                                        }).format(new Date(item.date))}
                                    </td>
                                    <td className="col2">{item.cenaDPH} €</td>
                                    <td className="col3 poznamkaFilter">{item.note}</td>
                                    <td className="col4">
                                        <i className="fa-solid fa-pencil" 
                                            onClick={() => {localStorage.setItem("inventura_id", item.id);
                                            window.location.href = "/opravitInventura";}}>
                                        </i>
                                        <i className="fa-solid fa-circle-info" 
                                            onClick={() => {localStorage.setItem("inventura_id", item.id);
                                            window.location.href = "/infoInventura";}}>
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