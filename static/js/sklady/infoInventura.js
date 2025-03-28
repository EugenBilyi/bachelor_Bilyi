const { useState, useEffect } = React;

function App() {
    const [inventura, setInventura] = useState(null);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/assets/empty_profile_logo.jpg'
    });

    const inventuraId = localStorage.getItem("inventura_id");

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
    
                if (!inventuraId) {
                    throw new Error("Chyba: inventura_id nie je definované.");
                }
    
                const [inventuraData, polozkyData, itemsData] = await Promise.all([
                    fetchWithRetry(`/api/inventura?id=${inventuraId}`),
                    fetchWithRetry(`/api/get_inventura_polozky?inventura_id=${inventuraId}`),
                    fetchWithRetry("/items")
                ]);
    
                if (inventuraData.success === false) throw new Error(inventuraData.error);
                if (polozkyData.success === false) throw new Error(polozkyData.error);
    
                if (isMounted) {
                    // Группировка polozky по категориям
                    const categorizedItems = {};
                    polozkyData.forEach(polozka => {
                        if (!categorizedItems[polozka.category]) {
                            categorizedItems[polozka.category] = [];
                        }
                        const matchingItem = itemsData.find(item => item.product_name === polozka.product_name);
                        categorizedItems[polozka.category].push({
                            ...polozka,
                            unit: matchingItem?.unit || "",
                            dph: matchingItem?.DPH || "0%",
                            cenaDPH: matchingItem?.cenaDPH || "0.00 €"
                        });
                    });
    
                    setInventura(inventuraData);
                    setItems(polozkyData);
                    setCategories(Object.keys(categorizedItems).map(category => ({
                        name: category,
                        products: categorizedItems[category]
                    })));
                }
            } catch (err) {
                console.error("Chyba pri načítaní údajov:", err);
                if (isMounted) setError(`Chyba pri načítaní údajov: ${err.message}`);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
    
        loadData();
    
        return () => { isMounted = false; };
    }, [inventuraId]);   

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

    const nedostatok = items
        .filter(item => item.differencePrice < 0)
        .reduce((sum, item) => sum + item.differencePrice, 0)
        .toFixed(2);

    const prebytok = items
        .filter(item => item.differencePrice >= 0)
        .reduce((sum, item) => sum + item.differencePrice, 0)
        .toFixed(2);

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

    return (
        <div>
            <header>
                <a href="/skladove_karty" className="logo">Skladový systém</a>
                <nav>
                    <ul>
                        <li><a href="#">ÚČTY</a></li>
                        <li className='sklady'>
                            <a href="/skladove_karty">SKLADY</a>
                            <ul>
                                <li><a href="/skladove_karty">Skladové karty</a></li>
                                <li><a href="/categories">Kategórie skladových kariet</a></li>
                                <li><a href="/naskladnenie">Naskladnenie</a></li>
                                <li className="current"><a href="/inventury">Inventúry</a></li>
                            </ul>
                        </li>
                        <li><a href="#">FAKTURÁCIE</a></li>
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
                        <li><a href="/naskladnenie">Naskladnenie</a></li>
                        <li className="current"><a href="/inventury">Inventúry</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <div>
                        <i className="fa-solid fa-arrow-left" onClick={() => window.location.href = '/inventury'}></i>
                        <p>Detail inventúry</p>
                    </div>
                </div>
                <div className="mainPlace">
                    {inventura ? (
                        <div className="infoTable">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Dátum</th>
                                        <th>Nedostatok</th>
                                        <th>Prebytok</th>
                                        <th>Bilancia</th>
                                        <th>Poznámka</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{inventura.date.split("T")[0]}</td>
                                        <td>{nedostatok} €</td>
                                        <td>{prebytok} €</td>
                                        <td>{parseFloat(inventura.cenaDPH).toFixed(2)} €</td>
                                        <td>{inventura.note || "-"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : null}

                    <h2 className="categoryTitle">Skladové karty</h2>

                    {categories.map(category => (
                        <div key={category.name} className="categoryTable">
                            <h3>{category.name}</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Názov</th>
                                        <th>Stav pred inventúrou</th>
                                        <th>Zaznamenaný stav</th>
                                        <th>Rozdiel</th>
                                        <th>DPH</th>
                                        <th>Cena s DPH</th>
                                        <th>Bilancia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {category.products.map(item => (
                                        <tr key={item.product_name}>
                                            <td>{item.product_name}</td>
                                            <td>{item.oldQuantity} {item.unit}</td>
                                            <td>{item.actualQuantity} {item.unit}</td>
                                            <td>{item.differenceQuantity} {item.unit}</td>
                                            <td>{item.dph}</td>
                                            <td>{item.cenaDPH} €</td>
                                            <td>{item.differencePrice.toFixed(2)} €</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
