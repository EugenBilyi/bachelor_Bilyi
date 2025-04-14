const { useEffect, useState } = React;

function search() {
    let filter = document.getElementById('searchBar').value.toUpperCase();
    let items = document.querySelectorAll('.product'); 

    items.forEach(item => {
        let value = item.textContent || item.innerText;
        if (value.toUpperCase().includes(filter)) {
            item.parentElement.style.display = "";
        } else {
            item.parentElement.style.display = "none";
        }
    });
}

function App() {

    const [items, setItems] = useState([]);
    const [arrowDirection, setArrowDirection] = React.useState(true); // true - стрелка вверх, false - стрелка вниз
    const [newCategory, setNewCategory] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
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
    
                const categoriesData = await fetchWithRetry('/categories_api', 3);
    
                if (isMounted) {
                    setItems(categoriesData);
                }
            } catch (err) {
                console.error("Chyba pri načítaní kategórií:", err);
                if (isMounted) setError("Chyba pri načítaní údajov. Skúste to znova.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
    
        loadData();
    
        return () => {
            isMounted = false;
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
        sortItems();
    };

    const sortItems = () => {
        const sortedItems = [...items].sort((a, b) => {
            if (!arrowDirection) {
                return a.category.localeCompare(b.category); // По убыванию
            } else {
                return b.category.localeCompare(a.category); // По возрастанию
            }
        });
        setItems(sortedItems);
    };

    const handleAddCategory = () => {
        const userData = localStorage.getItem('user');
        const user = userData ? JSON.parse(userData) : null;

        if (!user || !newCategory.trim()) {
            setErrorMessage('Category name cannot be empty');
            return;
        }

        fetch('http://127.0.0.1:5000/add_category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.email}`
            },
            body: JSON.stringify({ category: newCategory.trim() })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                setItems([...items, { category: newCategory }]); // Обновление списка категорий
                setNewCategory(''); // Очиcтка input
                setErrorMessage('');
            } else {
                setErrorMessage(data.error || 'An error occurred');
            }
        })
        .catch(error => {
            setErrorMessage('Error adding category');
            console.error(error);
        });
    };

    const handleDeleteCategory = (category) => {
        const userData = localStorage.getItem('user');
        const user = userData ? JSON.parse(userData) : null;
    
        if (!user) {
            setErrorMessage('Unauthorized user');
            return;
        }
    
        fetch('http://127.0.0.1:5000/delete_category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.email}`
            },
            body: JSON.stringify({ category: category })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                setItems(items.filter(item => item.category !== category)); // Удаляем из списка
                setErrorMessage('');
            } else {
                setErrorMessage(data.error || 'Error deleting category');
            }
        })
        .catch(error => {
            setErrorMessage('Error deleting category');
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
    
        fetch('http://127.0.0.1:5000/export_categories_csv', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${user.email}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error exporting CSV');
            }
            return response.blob(); // Получаем данные в формате Blob
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'categories.csv'; // Имя файла для сохранения
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url); // Освобождаем URL
        })
        .catch(error => {
            setErrorMessage('Error exporting CSV');
            console.error(error);
        });
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
                        <li><a href = "/uctenky">ÚČTY</a>
                            <ul>
                                <li><a href="/uctenky">Účtenky</a></li>
                            </ul>
                        </li>
                        <li className = 'sklady'><a href = "/skladove_karty">SKLADY</a>
                            <ul>
                                <li><a href = "/skladove_karty">Skladové karty</a></li>
                                <li className="current"><a href = "/categories">Kategórie skladových kariet</a></li>
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
                        <li><a href="/skladove_karty">Skladové karty</a></li>
                        <li className="current"><a href="/categories">Kategórie skladových kariet</a></li>
                        <li><a href="/naskladnenie">Naskladnenie</a></li>
                        <li><a href="/inventury">Inventúry</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <p>Kategórie skladových kariet</p>
                </div>
            </div>


            <div className="mainPlace">
                <div className="newCategory">
                    <p>Názov novej kategórie</p>
                    <input type='text'name='text' value={newCategory} onChange={(e) => setNewCategory(e.target.value)}/>
                    <button type='button' onClick={handleAddCategory}>Pridať</button>
                </div>
                <p style={{ color: 'red' }}>{errorMessage}</p>
                <div className="tableCategories">
                    <ul className="headerUl">
                        <li><button onClick={handleExportCSV}>Export do .csv</button></li>
                        <li>
                            <span><p onClick={toggleArrowDirection}>Názov</p> 
                                <i className={arrowDirection ? 'fa fa-arrow-up' : 'fa fa-arrow-down'}></i>
                            </span>
                            <span>Akcie</span>
                        </li>
                        <li>
                            <span className="searchWrapper">
                                <div className="searchContainer">
                                    <i className="searchIcon fa-solid fa-magnifying-glass"></i>
                                    <input className="searchInput" type="text" name="searchBar" id="searchBar" onChange={search} required />
                                </div>
                            </span>
                            <span>Akcie</span>
                        </li>
                        {items.map(item => (
                            <li className="tableBlock" key={item.category}>
                                <span className = "product" id = "find">{item.category}</span>
                                <span><button onClick={() => handleDeleteCategory(item.category)}>Vymazať</button></span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}


ReactDOM.render(<App />, document.getElementById('app'));