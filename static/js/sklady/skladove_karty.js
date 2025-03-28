const socket = io(); // Подключение к WebSocket

const { useEffect, useState } = React;

// Общая функция фильтрации, объединяющая все выбранные фильтры
function applyFilters() {
    let nameFilter = document.getElementById('searchBar').value.toUpperCase();
    let categoryFilter = document.getElementById('categorySelect').value.toUpperCase();
    let unitFilter = document.getElementById('unitSelect').value.toUpperCase();
    let dphFilter = document.getElementById('dphSelect').value.toUpperCase();
    
    let items = document.querySelectorAll('.tableBlock');

    items.forEach(item => {
        let productName = (item.querySelector('.product').textContent || item.querySelector('.product').innerText).toUpperCase();
        let category = (item.querySelector('td:nth-child(2)').textContent || item.querySelector('td:nth-child(2)').innerText).toUpperCase().trim();
        let unit = (item.querySelector('td:nth-child(4)').textContent || item.querySelector('td:nth-child(4)').innerText).toUpperCase().trim();
        let dph = (item.querySelector('td:nth-child(6)').textContent || item.querySelector('td:nth-child(6)').innerText).toUpperCase().trim();

        // Проверяем соответствие всех фильтров одновременно
        let matchesName = productName.includes(nameFilter);
        let matchesCategory = categoryFilter === 'VYBERTE KATEGÓRIU' || category === categoryFilter;
        let matchesUnit = unitFilter === 'VYBERTE JEDNOTKU' || unit === unitFilter;
        let matchesDPH = dphFilter === 'VYBERTE DPH' || dph === dphFilter;

        // Если элемент удовлетворяет всем фильтрам, показываем его, иначе скрываем
        if (matchesName && matchesCategory && matchesUnit && matchesDPH) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    });
}

// Отдельные функции фильтрации вызывают общую функцию для обновления всех фильтров
function search() {
    applyFilters();
}

function search_category() {
    applyFilters();
}

function search_unit() {
    applyFilters();
}

function search_DPH() {
    applyFilters();
}

function App() {
    const [arrowDirection, setArrowDirection] = React.useState(true);
    const [sortCategory, setSortCategory] = React.useState(true);
    const [sortCount, setSortCount] = React.useState(true);
    const [sortUnit, setSortUnit] = React.useState(true);
    const [sortPrice, setSortPrice] = React.useState(true);
    const [sortDPH, setSortDPH] = React.useState(true);
    const [items, setItems] = useState([]);

    const [errorMessage, setErrorMessage] = useState('');

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
            window.location.href = '/authorization_page';
            return;
        }
    
        const fetchData = async () => {
            try {
                const data = await fetchWithRetry('/items');
                if (isMounted) {
                    setItems(data);
                }
            } catch (err) {
                console.error("Chyba pri načítaní položiek:", err);
                if (isMounted) setError("Chyba pri načítaní údajov. Skúste to znova.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
    
        fetchData();
    
        socket.on("items_updated", fetchData);
    
        return () => {
            isMounted = false;
            socket.off("items_updated", fetchData);
        };
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
        sortItemsByName();
    };

    const toggleSortCategory = () => {
        setSortCategory(!sortCategory);
        sortItemsByCategory();
    }

    const toggleSortCount = () => {
        setSortCount(!sortCount);
        sortItemsByCount();
    }
    const toggleSortUnit = () => {
        setSortUnit(!sortUnit);
        sortItemsByUnit();
    }
    const toggleSortPrice = () => {
        setSortPrice(!sortPrice);
        sortItemsByPrice();
    }
    const toggleSortDPH = () => {
        setSortDPH(!sortDPH);
        sortItemsByDPH();
    }

    const sortItemsByName = () => {
        const sortedItems = [...items].sort((a, b) => {
            if (!arrowDirection) {
                return a.product_name.localeCompare(b.product_name); // По возрастанию
            } else {
                return b.product_name.localeCompare(a.product_name); // По убыванию
            }
        });
        setItems(sortedItems);
    };

    const sortItemsByCategory = () => {
        const sortedItems = [...items].sort((a, b) => {
            if (!sortCategory) {
                return a.category.localeCompare(b.category); // По возрастанию
            } else {
                return b.category.localeCompare(a.category); // По убыванию
            }
        });
        setItems(sortedItems);
    };

    const sortItemsByCount = () => {
        const sortedItems = [...items].sort((a, b) => {
            if (!sortCount) {
                return parseFloat(a.quantity) - parseFloat(b.quantity); // По возрастанию
            } else {
                return parseFloat(b.quantity) - parseFloat(a.quantity); // По убыванию
            }
        });
        setItems(sortedItems);
    };

    const sortItemsByUnit = () => {
        const sortedItems = [...items].sort((a, b) => {
            if (!sortUnit) {
                return a.unit.localeCompare(b.unit); // По возрастанию
            } else {
                return b.unit.localeCompare(a.unit); // По убыванию
            }
        });
        setItems(sortedItems);
    };

    const sortItemsByPrice = () => {
        const sortedItems = [...items].sort((a, b) => {
            if (!sortPrice) {
                return parseFloat(a.cenaDPH) - parseFloat(b.cenaDPH); // По возрастанию
            } else {
                return parseFloat(b.cenaDPH) - parseFloat(a.cenaDPH); // По убыванию
            }
        });
        setItems(sortedItems);
    };

    const sortItemsByDPH = () => {
        const sortedItems = [...items].sort((a, b) => {
            if (!sortDPH) {
                return a.DPH.localeCompare(b.DPH); // По возрастанию
            } else {
                return b.DPH.localeCompare(a.DPH); // По убыванию
            }
        });
        setItems(sortedItems);
    };

    const handleCategoryChange = (event) => {
        event.target.style.color = event.target.value === 'VYBERTE KATEGÓRIU' ? 'rgba(128,128,128,0.7)' : 'black';
    };

    const handleUnitChange = (event) => {
        event.target.style.color = event.target.value === 'VYBERTE JEDNOTKU' ? 'rgba(128,128,128,0.7)' : 'black';
    };

    const handleDPHChange = (event) => {
        event.target.style.color = event.target.value === 'VYBERTE DPH' ? 'rgba(128,128,128,0.7)' : 'black';
    };


    const handleDeleteItem = (item) => {
        const userData = localStorage.getItem('user');
        const user = userData ? JSON.parse(userData) : null;
    
        if (!user) {
            setErrorMessage('Unauthorized user');
            return;
        }
    
        fetch('/delete_item', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.email}`
            },
            body: JSON.stringify({ product_name: item })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                setItems(items.filter(item => item.product_name !== item)); // Удаляем из списка
                setErrorMessage('');
            } else {
                setErrorMessage(data.error || 'Error deleting item');
            }
        })
        .catch(error => {
            setErrorMessage('Error deleting item');
            console.error(error);
        });
    };    



    const handleExportCSV = () => {
        const userData = localStorage.getItem('user');
        const user = userData ? JSON.parse(userData) : null;
    
        if (!user) {
            setErrorMessage('Unauthorized user');
            return;
        }
    
        const headers = ["Nazov", "Kategorie", "Počet", "Jednotka", "Cena s DPH", "DPH"];
        const rows = items.map(item => [
            item.product_name,
            item.category,
            item.quantity,
            item.unit,
            item.cenaDPH,
            item.DPH
        ]);
    
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const columnWidths = [
            { wch: 20 },
            { wch: 20 },
            { wch: 10 },
            { wch: 10 },
            { wch: 15 },
            { wch: 10 }
        ];
        ws['!cols'] = columnWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Skladové karty');
        XLSX.writeFile(wb, 'items.xlsx');
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
                                <li className="current"><a href = "/skladove_karty">Skladové karty</a></li>
                                <li><a href = "/categories">Kategórie skladových kariet</a></li>
                                <li><a href = "/naskladnenie">Naskladnenie</a></li>
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
                        <li className="current"><a href="/skladove_karty">Skladové karty</a></li>
                        <li><a href="/categories">Kategórie skladových kariet</a></li>
                        <li><a href="/naskladnenie">Naskladnenie</a></li>
                        <li><a href="/inventury">Inventúry</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <p>Skladové karty</p>
                    <button onClick={() => window.open('/nova_skladova_karta', '_blank', 'width=800, height=580, resizable=no')}>
                        <i className="fa-solid fa-plus"></i>Nová skladová karta
                    </button>
                </div>
            </div>
            <div className="mainPlace">
                <div className="tableCategories">
                    <table>
                        <tr>
                            <td colSpan="7">
                                <div className="buttonContainer">
                                    <button onClick={handleExportCSV}>Export do .csv</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            {/* <td className="col1" rowspan="2"><input className="checkboxInput" type="checkbox"></input></td> */}
                            <td className="col1">
                                <div className="nameCol"><p onClick={toggleArrowDirection}>Nazov<i className={arrowDirection ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down'}></i></p></div>
                            </td>
                            <td className="col2">
                                <div className="nameCol"><p onClick={toggleSortCategory}>Kategorie<i className="fa-solid fa-sort"></i></p></div>
                            </td>
                            <td className="col3">
                                <div className="nameCol"><p onClick={toggleSortCount}>Počet<i className="fa-solid fa-sort"></i></p></div>
                            </td>
                            <td className="col4">
                                <div className="nameCol"><p onClick={toggleSortUnit}>Jednotka<i className="fa-solid fa-sort"></i></p></div>
                            </td>
                            <td className="col5">
                                <div className="nameCol"><p onClick={toggleSortPrice}>Cena s DPH<i className="fa-solid fa-sort"></i></p></div>
                            </td>
                            <td className="col6">
                                <div className="nameCol"><p onClick={toggleSortDPH}>DPH<i className="fa-solid fa-sort"></i></p></div>
                            </td>
                            <td className="col7">
                                <div className="nameCol">Akcie</div>
                            </td>
                        </tr>

                        <tr>
                            <td className="col1">
                                <div className="blockInput">
                                    <i className="searchIcon fa-solid fa-magnifying-glass"></i>
                                    <input className="searchInput" type="text" name="searchBar" id="searchBar" onChange={search}></input>
                                </div>
                            </td>
                            <td className="col2">
                                <form action="">
                                    <select id="categorySelect" onChange={(e) => {search_category(); handleCategoryChange(e); }}>
                                        <option value="VYBERTE KATEGÓRIU">Vyberte kategóriu</option>
                                        {[...new Set(items.map(item => item.category))].map(category => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </form>
                            </td>
                            <td className="col3"></td>
                            <td className="col4">
                            <form action="">
                                    <select id="unitSelect" onChange={(e) => { search_unit(); handleUnitChange(e); }}>
                                        <option value="VYBERTE JEDNOTKU">Vyberte jednotku</option>
                                        {[...new Set(items.map(item => item.unit))].map(unit => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </form>
                            </td>
                            <td className="col5"></td>
                            <td className="col6">
                                <form action="">
                                    <select id="dphSelect" onChange={(e) => { search_DPH(); handleDPHChange(e); }}>
                                        <option value="VYBERTE DPH">Vyberte DPH</option>
                                        {[...new Set(items.map(item => item.DPH))].map(DPH => (
                                            <option key={DPH} value={DPH}>{DPH}</option>
                                        ))}
                                    </select>
                                </form>
                            </td>
                            <td className="col7"></td>
                        </tr>

                        {items.map(item => (
                            <tr key={item.id} className="tableBlock">
                                {/* <td><input className="checkboxInput" type="checkbox"></input></td> */}
                                <td className = "product">{item.product_name}</td>
                                <td>{item.category}</td>
                                <td>{item.quantity}</td>
                                <td><a> {item.unit}</a></td>
                                <td>{item.cenaDPH}<a>€</a></td>
                                <td>{item.DPH}</td>
                                <td>
                                    <i className="fa-solid fa-trash-can"  onClick={() => handleDeleteItem(item.product_name)}></i>
                                    <i className="fa-solid fa-pencil" onClick={() => window.open(`/opravit_skladova_karta?product_name=${encodeURIComponent(item.product_name)}`, 
                                        '_blank', 'width=800, height=580, resizable=no')}></i>
                                    <i className="fa-solid fa-circle-info"></i>
                                </td>
                            </tr>
                        ))}
                    </table>
                </div>
            </div>
        </div>
    )
}


ReactDOM.render(<App />, document.getElementById('app'));