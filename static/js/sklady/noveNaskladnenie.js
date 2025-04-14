const { useEffect, useState } = React;
const Modal = window.Modal;

function App() {
    const [rows, setRows] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCustomDate, setIsCustomDate] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [supplier, setSupplier] = useState("");
    const [supplierSuggestions, setSupplierSuggestions] = useState([]);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/avatars/empty_profile_logo.jpg'
    });

    useEffect(() => {
        if (supplierSuggestions.length > 0) {
            setShowSupplierDropdown(true);
        } else {
            setShowSupplierDropdown(false);
        }
    }, [supplierSuggestions]);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await fetch('/api/profile_data');
                const data = await response.json();
    
                if (data.success) {
                    setProfile(data.profile);
                } else {
                    console.error('Chyba pri načítaní profilu:', data.error || 'Neznáma chyba');
                }
            } catch (err) {
                console.error('Chyba pri načítaní profilu:', err);
            }
        };
    
        loadProfile();
    }, []);

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

    const [date, setDate] = useState(getBratislavaDate()); // Устанавливаем только дату
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
    

    const handleAddRow = () => {
        setRows([...rows, ""]);
    };

    const handleInputChange = (index, value) => {
        const newRows = [...rows];
        newRows[index] = value;
        setRows(newRows);
        setSearchText(value);

        if (value.length > 1) {
            fetch(`/search_polozka?query=${value}`)
                .then(response => response.json())
                .then(data => {
                    setSuggestions(data);
                    setShowDropdown(true);
                })
                .catch(err => console.error("Error fetching suggestions:", err));
        } else {
            setShowDropdown(false);
        }
    };

    const handleCreateNewItem = () => {
        setIsModalOpen(true);
    };

    const handleSaveNewItem = (name, category, dph, unit) => {
        setSelectedItems([...selectedItems, {
            name,
            dph: parseFloat(dph.replace("%", "")),
            unit,
            quantity: 1,
            priceWithoutDph: "0.00",
            priceWithDph: "0.00",
            totalPriceWithoutDph: "0.00",
            totalPriceWithDph: "0.00",
        }]);
    
        // Очистка строки из rows
        setRows(rows.filter(row => row !== searchText));
    
        // Очистка поискового запроса
        setSearchText("");
    
        // Закрытие модального окна
        setIsModalOpen(false);
        setShowDropdown(false);
    };
      

    const handleSelectSuggestion = (index, item) => {
        fetch(`/get_polozka_data?name=${item}`)
            .then(response => response.json())
            .then(data => {
                const dphRate = parseFloat(data.dph.replace('%', ''));
                const cenaSDph = parseFloat(data.cenaDPH);
                const cenaBezDph = cenaSDph / (1 + dphRate / 100);

                setSelectedItems([...selectedItems, {
                    name: data.product_name,
                    dph: dphRate,
                    unit: data.unit,
                    quantity: 1,
                    priceWithoutDph: cenaBezDph.toFixed(2),
                    priceWithDph: cenaSDph.toFixed(2),
                    totalPriceWithoutDph: cenaBezDph.toFixed(2),
                    totalPriceWithDph: cenaSDph.toFixed(2),
                }]);

                setRows(rows.filter((_, i) => i !== index));
                setShowDropdown(false);
            })
            .catch(err => console.error("Error fetching item data:", err));
    };

    const handleRemoveItem = (index) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    const handleQuantityChange = (index, value) => {
        const newItems = [...selectedItems];
        newItems[index].quantity = value;
        const quantityNum = parseFloat(value) || 0;
        newItems[index].totalPriceWithoutDph = (quantityNum * parseFloat(newItems[index].priceWithoutDph)).toFixed(2);
        newItems[index].totalPriceWithDph = (quantityNum * parseFloat(newItems[index].priceWithDph)).toFixed(2);
        setSelectedItems(newItems);
    };
    

    const handlePriceChange = (index, value, type) => {
        const newItems = [...selectedItems];
        const price = parseFloat(value) || 0;
        if (type === "withoutDph") {
            newItems[index].priceWithoutDph = price.toFixed(2);
            newItems[index].priceWithDph = (price * (1 + newItems[index].dph / 100)).toFixed(2);
        } else {
            newItems[index].priceWithDph = price.toFixed(2);
            newItems[index].priceWithoutDph = (price / (1 + newItems[index].dph / 100)).toFixed(2);
        }
        newItems[index].totalPriceWithoutDph = (newItems[index].quantity * parseFloat(newItems[index].priceWithoutDph)).toFixed(2);
        newItems[index].totalPriceWithDph = (newItems[index].quantity * parseFloat(newItems[index].priceWithDph)).toFixed(2);
        setSelectedItems(newItems);
    };

    const handleRemoveRow = (index) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const totalWithoutDph = selectedItems.reduce((acc, item) => acc + parseFloat(item.totalPriceWithoutDph), 0).toFixed(2);
    const totalWithDph = selectedItems.reduce((acc, item) => acc + parseFloat(item.totalPriceWithDph), 0).toFixed(2);

    const handleSupplierChange = (event) => {
        const value = event.target.value;
        setSupplier(value);
    
        if (value.length > 1) {
            fetch(`/search_supplier?query=${value}`)
                .then(response => response.json())
                .then(data => {
                    setSupplierSuggestions(data);
                })
                .catch(err => console.error("Chyba pri nacitani dodavatela:", err));
        } else {
            setSupplierSuggestions([]);
        }
    };

    const handleSupplierBlur = () => {
        setTimeout(() => setShowSupplierDropdown(false), 200);
    };
    
    const handleSupplierFocus = () => {
        if (supplierSuggestions.length > 0) {
            setShowSupplierDropdown(true);
        }
    };    

    const handleSelectSupplier = (selectedSupplier) => {
        setSupplier(selectedSupplier);
        setShowSupplierDropdown(false);
    };

    const handleCreateStockEntry = async () => {
        setErrorMessage(null);
    
        if (!date) {
            setErrorMessage("Musíte vybrať dátum.");
            return;
        }
    
        if (selectedItems.some(item => parseFloat(item.quantity) === 0)) {
            setErrorMessage("Množstvo nesmie byť 0.");
            return;
        }
    
        const supplier = document.querySelector('.formRow .inputField')?.value || null;
        const documentNumber = document.querySelector('.formRow .inputField:nth-of-type(2)')?.value || null;
        const note = document.querySelector('.formRow textarea')?.value || null;
        const cenaDPH = selectedItems.reduce((acc, item) => acc + parseFloat(item.totalPriceWithDph), 0).toFixed(2);
        const fullDateTime = `${date}T${time}`;
    
        try {
            // 1. Отправляем naskladnenie
            const response = await fetch('/api/naskladnenie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: fullDateTime, supplier, documentNumber, cenaDPH, note })
            });
    
            const naskladnenie = await response.json();
            if (!naskladnenie.success) {
                setErrorMessage(`Chyba pri ukladaní: ${naskladnenie.error}`);
                return;
            }
    
            // 2. Створюємо fakturu
            await fetch('/api/create_faktura', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cena: cenaDPH })  // це вже строка, типу "12.50"
            });

            // 3. Добавляем všetky položky s týmto naskladnením
            await Promise.all(selectedItems.map(async (item) => {
                const itemData = {
                    naskladnenie_id: naskladnenie.id,
                    product_name: item.name,
                    DPH: item.dph + "%",
                    quantity: item.quantity,
                    price_without_DPH: item.priceWithoutDph,
                    price_with_DPH: item.priceWithDph,
                    total_without_DPH: item.totalPriceWithoutDph,
                    total_with_DPH: item.totalPriceWithDph,
                };
    
                await fetch('/api/naskladnenie_polozky', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
            }));
    
            // Очищаем форму
            setSelectedItems([]);
            setRows([]);
            handleSetCurrentDate();
            
            socket.emit('update_items');
    
        } catch (error) {
            setErrorMessage(`Chyba pri ukladaní naskladnenia: ${error.message}`);
        }
    };
    
    const handleCreateAndRedirect = async () => {
        await handleCreateStockEntry();
        window.location.href = "/naskladnenie";
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
                                <li className="current"><a href="/naskladnenie">Naskladnenie</a></li>
                                <li><a href="/inventury">Inventúry</a></li>
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
                        <li className="current"><a href="/naskladnenie">Naskladnenie</a></li>
                        <li><a href="/inventury">Inventúry</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <div>
                        <i className="fa-solid fa-arrow-left" onClick={() => window.location.href = '/naskladnenie'}></i>
                        <p>Nové naskladnenie</p>
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
                            <p>Dodávateľ</p>
                            <div className="supplier-container">
                                <input 
                                    type="text" 
                                    className="inputField" 
                                    value={supplier}
                                    onChange={handleSupplierChange}
                                    onBlur={handleSupplierBlur}
                                    onFocus={handleSupplierFocus}
                                />
                                {showSupplierDropdown && supplierSuggestions.length > 0 && (
                                    <div className="supplier-dropdown">
                                        {supplierSuggestions.map((suggestion, index) => (
                                            <div key={index} className="supplier-dropdown-item"
                                                onClick={() => handleSelectSupplier(suggestion)}>
                                                {suggestion}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="formRow">
                            <p>Číslo dokladu</p>
                            <input type="text" className="inputField" />
                            <p>Poznámka</p>
                            <textarea className="inputField"></textarea>
                        </div>
                        {selectedItems.length > 0 && (
                            <div className="tableBlock">
                                <table>
                                    <thead>
                                        <tr className="priceRow">
                                            <td colSpan="5"><p>Jednotková cena</p></td>
                                            <td colSpan="2"><p>Celkom</p></td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td>Názov položky</td>
                                            <td>DPH</td>
                                            <td>Množstvo</td>
                                            <td>Bez DPH</td>
                                            <td>S DPH</td>
                                            <td>Bez DPH</td>
                                            <td>S DPH</td>
                                            <td></td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItems.map((item, index) => (
                                            <tr key={index} className="selectedItem">
                                                <td>{item.name}</td>
                                                <td>{item.dph}%</td>
                                                <td className="inputCell">
                                                    <div className="inputWrapper">
                                                        <input type="text" value={item.quantity}
                                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                            className="inputField inputWithUnit"
                                                            onKeyPress={(e) => {
                                                                if (/[0-9]/.test(e.key)) return;
                                                                if (e.key === '.' && e.target.value.includes('.')) {
                                                                    e.preventDefault();
                                                                } else if (e.key === '.') {
                                                                    return;
                                                                } else {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                        />
                                                        <span className="unitSuffix">{item.unit}</span>
                                                    </div>
                                                </td>
                                                <td className="inputCell">
                                                    <div className="inputWrapper">
                                                        <input 
                                                            type="text"
                                                            value={item.priceWithoutDph}
                                                            onChange={(e) => handlePriceChange(index, e.target.value, "withoutDph")}
                                                            className="inputField inputWithCurrency"
                                                            onKeyPress={(e) => !/[0-9.]/.test(e.key) && e.preventDefault()}
                                                        />
                                                        <span className="currencySuffix">€</span>
                                                    </div>
                                                </td>
                                                <td className="inputCell">
                                                    <div className="inputWrapper">
                                                        <input 
                                                            type="text"
                                                            value={item.priceWithDph}
                                                            onChange={(e) => handlePriceChange(index, e.target.value, "withDph")}
                                                            className="inputField inputWithCurrency"
                                                            onKeyPress={(e) => !/[0-9.]/.test(e.key) && e.preventDefault()}
                                                        />
                                                        <span className="currencySuffix">€</span>
                                                    </div>
                                                </td>
                                                <td>{item.totalPriceWithoutDph}€</td>
                                                <td>{item.totalPriceWithDph}€</td>
                                                <td>
                                                    <div className="removeBtn" onClick={() => handleRemoveItem(index)}>
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {rows.map((row, index) => (
                            <div className="addedRow" key={index}>
                                <input type="text" className="inputField" value={row}
                                    onChange={(e) => handleInputChange(index, e.target.value)} 
                                    placeholder="Zadajte položku..."
                                />
                                {showDropdown && searchText.length > 1 && (
                                    <div className="dropdown">
                                        {suggestions.length > 0 ? (
                                            suggestions.map((item, i) => (
                                                <div key={i} className="dropdown-item"
                                                    onClick={() => handleSelectSuggestion(index, item)}>
                                                    {item}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="dropdown-item new-item"
                                                onClick={() => handleCreateNewItem(index)}>
                                                Vytvoriť položku '{searchText}'
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="removeBtn" onClick={() => handleRemoveRow(index)}>
                                    <i className="fa-solid fa-xmark"></i>
                                </div>
                            </div>
                        ))}
                        <div className="addRow" onClick={handleAddRow}>
                            +
                        </div>
                        {selectedItems.length > 0 && (                     
                            <div className="bottomBlock">
                                <button onClick={handleCreateAndRedirect}>
                                    Vytvoriť
                                </button>
                                <div className="totalPrice">
                                    <span>
                                        Celková cena bez DPH: {totalWithoutDph}€
                                    </span>
                                    <span>
                                        Celková cena s DPH: {totalWithDph}€
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <Modal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                        searchText={searchText} 
                        onSave={handleSaveNewItem} 
                    />
                </div>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
