const { useState, useEffect } = React;

function App() { 
    const [isLoading, setIsLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [isCategories, setIsCategories] = useState(false);
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/avatars/empty_profile_logo.jpg'
    });

    const [categories, setCategories] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [allItems, setAllItems] = useState([]);
    const [itemsByCategory, setItemsByCategory] = useState({}); 
    const [totalDifference, setTotalDifference] = useState("0.00 €");
    const [inventuraPolozky, setInventuraPolozky] = useState([]);
    const [note, setNote] = useState("");

    const inventuraId = localStorage.getItem("inventura_id");

    const fetchWithRetry = async (url, attempts = 3) => {
        for (let i = 0; i < attempts; i++) {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                return await res.json();
            } catch (err) {
                console.warn(`Fetch failed (${i + 1}/${attempts}): ${url}`, err);
                if (i === attempts - 1) throw err; // Если последняя попытка, пробрасываем ошибку
            }
        }
    };

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(null);

        const loadData = async () => {
            try {
                const [categoriesData, itemsData, inventuraData, inventuraPolozkyData] = await Promise.all([
                    fetchWithRetry('/categories_api'),
                    fetchWithRetry('/items'),
                    inventuraId ? fetchWithRetry(`/api/inventura?id=${inventuraId}`) : null,
                    inventuraId ? fetchWithRetry(`/api/get_inventura_polozky?inventura_id=${inventuraId}`) : []
                ]);

                if (isMounted) {
                    setCategories(categoriesData);
                    setAllItems(itemsData);

                    if (inventuraData) {
                        setDate(inventuraData.date ? inventuraData.date.split("T")[0] : "");
                        setNote(inventuraData.note || "");
                    }
                    setInventuraPolozky(inventuraPolozkyData);
                }
            } catch (err) {
                console.error("Data loading error:", err);
                if (isMounted) setError("Chyba pri načítaní údajov. Skúste to znova.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadData();

        return () => { isMounted = false; };
    }, [inventuraId]);

    useEffect(() => {
        calculateTotalDifference();
    }, [itemsByCategory]);

    useEffect(() => {
        if (allItems.length > 0 && categories.length > 0) {
            initializeItems();
        }
    }, [allItems, inventuraPolozky, categories]);

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

    const initializeItems = () => {
        const updatedItemsByCategory = {};
    
        categories.forEach(cat => {
            updatedItemsByCategory[cat.category] = allItems
                .filter(item => item.category === cat.category)
                .map(item => {
                    const invPolozka = inventuraPolozky.find(p => p.product_name === item.product_name);
    
                    if (invPolozka) {
                        // Для poloziek, которые участвовали в inventury
                        const differenceQuantity = (parseFloat(invPolozka.actualQuantity) - parseFloat(invPolozka.oldQuantity)).toFixed(2);
                        const differencePrice = (differenceQuantity * parseFloat(item.cenaDPH)).toFixed(2);
                        const differenceColor = differenceQuantity > 0 ? "green" : differenceQuantity < 0 ? "red" : "black";
    
                        return {
                            ...item,
                            oldQuantity: invPolozka.oldQuantity,
                            inputValue: invPolozka.actualQuantity.toString(),
                            difference: `${differenceQuantity} ${item.unit} / ${differencePrice} €`,
                            differenceColor: differenceColor,
                        };
                    }
    
                    // Для poloziek, которые НЕ были частью inventury (расчет остается как раньше)
                    return {
                        ...item,
                        oldQuantity: item.quantity,
                        inputValue: "",
                        difference: "-",
                        differenceColor: "black",
                    };
                });
        });
    
        setItemsByCategory(updatedItemsByCategory);
    };    
    

    const toggleCategory = (category) => {
        setExpandedCategories(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(category)) {
                newExpanded.delete(category);
            } else {
                newExpanded.add(category);
                if (!itemsByCategory[category]) {
                    const filteredItems = allItems.filter(item => item.category === category);
                    setItemsByCategory(prevItems => ({ ...prevItems, [category]: filteredItems }));
                }
            }
            setIsCategories(newExpanded.size > 0); // Если хотя бы одна категория открыта, isCategories = true
            return newExpanded;
        });
    };

    const toggleShowCategories = () => {
        if (isCategories) {
            setExpandedCategories(new Set());
            setIsCategories(false);
        } else {
            const allCategories = new Set(categories.map(cat => cat.category));
            setExpandedCategories(allCategories);
            
            setItemsByCategory(prev => {
                const updatedItemsByCategory = { ...prev };
                
                categories.forEach(cat => {
                    if (!updatedItemsByCategory[cat.category]) {
                        updatedItemsByCategory[cat.category] = allItems
                            .filter(item => item.category === cat.category)
                            .map(item => ({
                                ...item,
                                inputValue: prev[cat.category]?.find(i => i.id === item.id)?.inputValue || "",
                                difference: prev[cat.category]?.find(i => i.id === item.id)?.difference || "-",
                                differenceColor: prev[cat.category]?.find(i => i.id === item.id)?.differenceColor || "black"
                            }));
                    }
                });
    
                return updatedItemsByCategory;
            });
    
            setIsCategories(true);
        }
    };
    

    const getBratislavaDateTime = () => {
        const now = new Date();
        return new Intl.DateTimeFormat('sv-SE', { 
            timeZone: 'Europe/Bratislava',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
        }).format(now).replace(/,/g, '');
    };

    const getBratislavaDate = () => {
        return getBratislavaDateTime().split(' ')[0];
    };

    const getBratislavaTime = () => {
        return getBratislavaDateTime().split(' ')[1];
    };

    const [date, setDate] = useState(getBratislavaDate());
    const [time, setTime] = useState(getBratislavaTime());


    const getYesterdayDate = () => {
        const today = new Date();
        today.setDate(today.getDate() - 1); // Отнимаем один день
        return today.toISOString().split('T')[0];
    };

    const validateInput = (value) => {
        const regex = /^\d+(\.\d{0,2})?$/; // Разрешает только числа с точкой и максимум 2 знаками после нее
        return regex.test(value) || value === "";
    };

    const updateDifference = (item, inputValue, category) => {
        if (inputValue === "") {
            // Если поле ввода пустое, сбрасываем Rozdiel
            setItemsByCategory(prev => ({
                ...prev,
                [category]: prev[category].map(i =>
                    i.id === item.id
                        ? {
                              ...i,
                              inputValue: "",
                              difference: "-",
                              differenceColor: "black",
                          }
                        : i
                ),
            }));
            return;
        }
    
        const quantity = parseFloat(inputValue) || 0;
        const unitPrice = parseFloat(item.cenaDPH);
        
        // Определяем, было ли это item в inventura
        const invPolozka = inventuraPolozky.find(p => p.product_name === item.product_name);
        
        // Если polozka была в inventura, считаем rozdiel как inputValue - oldQuantity
        const skladPredInventurou = invPolozka ? parseFloat(invPolozka.oldQuantity) : parseFloat(item.quantity);
        
        const difference = (quantity - skladPredInventurou).toFixed(2);
        const priceDifference = (difference * unitPrice).toFixed(2);
    
        let color = "black";
        if (difference > 0) color = "green";
        if (difference < 0) color = "red";
    
        setItemsByCategory(prev => ({
            ...prev,
            [category]: prev[category].map(i =>
                i.id === item.id
                    ? {
                          ...i,
                          inputValue,
                          difference: `${difference} ${item.unit} / ${priceDifference} €`,
                          differenceColor: color,
                      }
                    : i
            ),
        }));
    };
    

    const calculateTotalDifference = () => {
        let total = 0;
        let hasDifference = false;
    
        Object.values(itemsByCategory).forEach(items => {
            items.forEach(item => {
                if (item.difference && item.difference !== "-") {
                    const pricePart = parseFloat(item.difference.split(" / ")[1].replace(" €", ""));
                    total += pricePart;
                    hasDifference = true;
                }
            });
        });
        setTotalDifference(hasDifference ? `${total.toFixed(2)} €` : "0.00 €");
    };

    const handleUpdateInventura = async () => {
        if (!date) {
            alert("Musíte vybrať dátum.");
            return;
        }
    
        let polozky = [];
        Object.values(itemsByCategory).forEach(items => {
            items.forEach(item => {
                if (item.difference && item.difference !== "-") {
                    const [diffQuantity, diffPrice] = item.difference.split(" / ").map(v => parseFloat(v.replace(" €", "")));
    
                    polozky.push({
                        product_name: item.product_name,
                        oldQuantity: parseFloat(item.oldQuantity),
                        actualQuantity: parseFloat(item.inputValue),
                        differenceQuantity: diffQuantity,
                        differencePrice: diffPrice
                    });
                }
            });
        });
    
        if (polozky.length === 0) {
            alert("Musíte urobiť inventúru aspoň jednej položky.");
            return;
        }

        const fullDateTime = `${date}T${time}`;
    
        try {
            const response = await fetch('/api/update_inventura', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: localStorage.getItem("inventura_id"),
                    date: fullDateTime,
                    note: note,
                    cenaDPH: parseFloat(totalDifference.replace(" €", "")) || 0.00,
                    polozky: polozky
                })
            });
    
            const result = await response.json();
            if (result.success) {
                alert("Inventura úspešne aktualizovaná!");
            } else {
                alert(`Chyba pri ukladaní: ${result.error}`);
            }
        } catch (error) {
            alert(`Chyba pri ukladaní inventury: ${error.message}`);
        }
    };    

    const handleUpdateAndRedirect = async () => {
        await handleUpdateInventura();
        window.location.href = "/inventury";
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

    return (
        <div>
            <header>
                <a href="/skladove_karty" className="logo">Skladový systém</a>
                <nav>
                    <ul>
                        <li><a href = "/uctenky">ÚČTY</a>
                            <ul>
                                <li><a href="/uctenky">Účtenky</a></li>
                            </ul>
                        </li>
                        <li className='sklady'>
                            <a href="/skladove_karty">SKLADY</a>
                            <ul>
                                <li><a href="/skladove_karty">Skladové karty</a></li>
                                <li><a href="/categories">Kategórie skladových kariet</a></li>
                                <li><a href="/naskladnenie">Naskladnenie</a></li>
                                <li className="current"><a href="/inventury">Inventúry</a></li>
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
                        <li><a href="/categories">Kategórie skladových kariet</a></li>
                        <li><a href="/naskladnenie">Naskladnenie</a></li>
                        <li className="current"><a href="/inventury">Inventúry</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <div>
                        <i className="fa-solid fa-arrow-left" onClick={() => window.location.href = '/inventury'}></i>
                        <p>Uprava inventúry</p>
                    </div>
                </div>
                <div className="mainPlace">
                    <div className="formContainer">
                        <div className="formRow">
                            <p>Dátum</p>
                            <div className="buttonGroup">
                                <input 
                                    type="date" 
                                    className="inputFieldDate" 
                                    onChange={(e) => setDate(e.target.value)}
                                    value={date} 
                                    max={getYesterdayDate()}
                                />
                            </div>
                        </div>
                        <div className="formRow">
                            <p>Poznámka</p>
                            <textarea className="inputField" value={note} onChange={(e) => setNote(e.target.value)}></textarea>
                        </div>
                        <div className="categoriesButton" onClick={toggleShowCategories}>
                            <i className={`fa-solid ${isCategories ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
                            <span>{isCategories ? 'Skryť všetky kategórie' : 'Zobraziť všetky kategórie'}</span>
                        </div>
                        <div className="totalPrice">
                                <span>
                                    Celkový rozdiel: {totalDifference}
                                </span>
                            </div>

                        <div>
                            {categories.map(cat => (
                                <div key={cat.id}>
                                    <div className="category" onClick={() => toggleCategory(cat.category)}>
                                        {cat.category}
                                    </div>
                                    <div className={`items-container ${expandedCategories.has(cat.category) ? 'open' : ''}`}>
                                        <table className="items-table">
                                            <thead>
                                                <tr>
                                                    <th>Názov</th>
                                                    <th>Sklad pred inventúrou</th>
                                                    <th>Množstvo</th>
                                                    <th>Rozdiel</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemsByCategory[cat.category]?.map(item => (
                                                    <tr key={item.id}>
                                                        <td>{item.product_name}</td>
                                                        <td>{item.oldQuantity} {item.unit}</td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                placeholder={item.oldQuantity}
                                                                className="input-mnozstvo"
                                                                value={itemsByCategory[cat.category]?.find(i => i.id === item.id)?.inputValue || ""}
                                                                onChange={(e) => {
                                                                    const newValue = e.target.value;
                                                                    if (validateInput(newValue)) {
                                                                        setItemsByCategory(prev => {
                                                                            const updatedItems = prev[cat.category].map(i =>
                                                                                i.id === item.id ? { ...i, inputValue: newValue } : i
                                                                            );
                                                                            return { ...prev, [cat.category]: updatedItems };
                                                                        });
                                                                        updateDifference(item, newValue, cat.category);
                                                                    }
                                                                }}
                                                            />
                                                            <span>{item.unit}</span>
                                                        </td>
                                                        <td style={{ color: item.differenceColor || "black" }}>
                                                            {item.difference || "-"}
                                                        </td>
                                                    </tr>
                                                )) || <tr><td colSpan="4">Načítavam položky...</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bottomBlock">
                            <button onClick={handleUpdateAndRedirect}>
                                Uložiť
                            </button>
                            <div className="totalPrice">
                                <span>
                                    Celkový rozdiel: {totalDifference}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
