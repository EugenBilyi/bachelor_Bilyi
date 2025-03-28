const { useState, useEffect } = React;

function App() { 
    const [isCustomDate, setIsCustomDate] = useState(false);  
    const [isCategories, setIsCategories] = useState(false);

    const [categories, setCategories] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [allItems, setAllItems] = useState([]); // Храним все položky
    const [itemsByCategory, setItemsByCategory] = useState({}); // Разделяем по категориям
    const [totalDifference, setTotalDifference] = useState("0.00 €");
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/assets/empty_profile_logo.jpg'
    });

    useEffect(() => {
        fetch('/categories_api')
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error('Error loading categories:', err));

        fetch('/items')
            .then(res => res.json())
            .then(data => setAllItems(data))
            .catch(err => console.error('Error loading items:', err));
    }, []);

    useEffect(() => {
        calculateTotalDifference();
    }, [itemsByCategory]);

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

    const handleSetCurrentDate = () => {
        setDate(getBratislavaDate());
        setTime(getBratislavaTime());
        setIsCustomDate(false);
    };

    const handleEnableCustomDate = () => {
        setIsCustomDate(true);
    };

    const handleDateChange = (event) => {
        setDate(event.target.value);
    };

    const validateInput = (value) => {
        const regex = /^\d+(\.\d{0,2})?$/;
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
        const skladQuantity = parseFloat(item.quantity);
        const unitPrice = parseFloat(item.cenaDPH);
    
        const difference = (quantity - skladQuantity).toFixed(2);
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

    const handleCreateInventura = async () => {
        let hasChanges = false;
        Object.values(itemsByCategory).forEach(items => {
            items.forEach(item => {
                if (item.difference && item.difference !== "-") {
                    hasChanges = true;
                }
            });
        });
    
        if (!hasChanges) {
            alert("Musíte urobiť inventúru aspoň jednej položky.");
            return;
        }
    
        if (!date) {
            alert("Musíte vybrať dátum.");
            return;
        }
    
        const note = document.querySelector('.formRow textarea')?.value || null;
        const cenaDPH = parseFloat(totalDifference.replace(" €", "")) || 0.00;
        const fullDateTime = `${date}T${time}`;
    
        try {
            const response = await fetch('/api/create_inventury', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: fullDateTime, note, cenaDPH })
            });
    
            const inventura = await response.json();
            if (!inventura.success) {
                alert(`Chyba pri ukladaní: ${inventura.error}`);
                return;
            }
    
            const changedItems = [];
            Object.values(itemsByCategory).forEach(items => {
                items.forEach(item => {
                    if (item.difference && item.difference !== "-") {
                        const [diffQuantity, diffPrice] = item.difference.split(" / ").map(v => parseFloat(v.replace(" €", "")));
    
                        changedItems.push({
                            inventury_id: inventura.id,
                            product_name: item.product_name,
                            category: item.category,
                            oldQuantity: parseFloat(item.quantity),
                            actualQuantity: parseFloat(item.inputValue),
                            differenceQuantity: diffQuantity,
                            differencePrice: diffPrice
                        });
                    }
                });
            });
    
            if (changedItems.length > 0) {
                await fetch('/api/create_inventury_polozky', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(changedItems)
                });
            }
    
            // Очистка формы
            setItemsByCategory({});
            handleSetCurrentDate();
            alert("Inventura úspešne uložená!");
    
        } catch (error) {
            alert(`Chyba pri ukladaní inventury: ${error.message}`);
        }
    };    

    const handleCreateAndRedirect = async () => {
        await handleCreateInventura();
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
                        <p>Nová inventúra</p>
                    </div>
                </div>
                <div className="mainPlace">
                    <div className="formContainer">
                        <div className="formRow">
                            <p>Dátum</p>
                            <div className="buttonGroup">
                                <button className="btn" onClick={handleSetCurrentDate}>Teraz</button>
                                <button className="btn" onClick={handleEnableCustomDate}>V minulosti</button>
                                {isCustomDate ? (
                                    <input 
                                        type="date" 
                                        className="inputFieldDate" 
                                        onChange={handleDateChange} 
                                        max={getYesterdayDate()}
                                        onKeyDown={(e) => e.preventDefault()}
                                    />
                                ) : (
                                    <p className="selectedDate">{`${date} ${time}`}</p>
                                )}
                            </div>
                        </div>
                        <div className="formRow">
                            <p>Poznámka</p>
                            <textarea className="inputField"></textarea>
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
                                                    <th>Sklad</th>
                                                    <th>Množstvo</th>
                                                    <th>Rozdiel</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemsByCategory[cat.category]?.map(item => (
                                                    <tr key={item.id}>
                                                        <td>{item.product_name}</td>
                                                        <td>{item.quantity} {item.unit}</td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                placeholder={item.quantity}
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
                            <button onClick={handleCreateAndRedirect}>
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
