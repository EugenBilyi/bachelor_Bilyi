const { useState } = React;
const Modal = window.Modal;

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/avatars/empty_profile_logo.jpg'
    });

    const [id, setId] = useState(null);
    const [supplier, setSupplier] = useState("");
    const [documentNumber, setDocumentNumber] = useState("");
    const [note, setNote] = useState("");

    const [searchText, setSearchText] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [rows, setRows] = useState([]); // Строки с инпутами
    const [selectedItems, setSelectedItems] = useState([]); // Готовые položky
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [supplierSuggestions, setSupplierSuggestions] = useState([]);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

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
                const naskladnenieId = localStorage.getItem("naskladnenie_id");
                if (!naskladnenieId) {
                    throw new Error("Chýba ID naskladnenia.");
                }
    
                setId(naskladnenieId);
    
                const allNaskladnenia = await fetchWithRetry('/naskladnenie_api');
                const selectedItem = allNaskladnenia.find(item => item.id.toString() === naskladnenieId);
    
                if (!selectedItem) {
                    throw new Error("Naskladnenie s týmto ID neexistuje.");
                }
    
                if (isMounted) {
                    setDate(selectedItem.date ? new Date(selectedItem.date).toISOString().split('T')[0] : "");
                    setSupplier(selectedItem.supplier || "");
                    setDocumentNumber(selectedItem.document_number || "");
                    setNote(selectedItem.note || "");
                }
    
                const polozkyData = await fetchWithRetry(`/api/get_naskladnenie_polozky?naskladnenie_id=${naskladnenieId}`);
                if (isMounted) {
                    setSelectedItems(polozkyData);
                }
    
            } catch (err) {
                console.error("Chyba pri načítaní údajov:", err);
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
    
    const handleQuantityChange = (index, value) => {
        const newItems = [...selectedItems];
        if (!newItems[index]) return;

        if (!/^\d*\.?\d*$/.test(value)) return;

        const quantityNum = parseFloat(value) || 0;
        newItems[index].quantity = value;
        newItems[index].totalPriceWithoutDph = (quantityNum * parseFloat(newItems[index].priceWithoutDph)).toFixed(2);
        newItems[index].totalPriceWithDph = (quantityNum * parseFloat(newItems[index].priceWithDph)).toFixed(2);
        setSelectedItems(newItems);
    };
    
    const handlePriceChange = (index, value, type) => {
        const newItems = [...selectedItems];
        if (!newItems[index]) return;

        if (!/^\d*\.?\d*$/.test(value)) return; 

        const price = parseFloat(value) || 0;
        if (type === "withoutDph") {
            newItems[index].priceWithoutDph = value;
            newItems[index].priceWithDph = (price * (1 + newItems[index].dph / 100)).toFixed(2);
        } else {
            newItems[index].priceWithDph = value;
            newItems[index].priceWithoutDph = (price / (1 + newItems[index].dph / 100)).toFixed(2);
        }
        newItems[index].totalPriceWithoutDph = (parseFloat(newItems[index].quantity) * parseFloat(newItems[index].priceWithoutDph)).toFixed(2);
        newItems[index].totalPriceWithDph = (parseFloat(newItems[index].quantity) * parseFloat(newItems[index].priceWithDph)).toFixed(2);
        setSelectedItems(newItems);
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
                .catch(() => setShowDropdown(false));
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
        setRows(rows.filter(row => row !== searchText));
        setSearchText("");
        setIsModalOpen(false);
        setShowDropdown(false);
    };

    const handleRemoveRow = (index) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleRemoveItem = (index) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
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

                setRows(rows.filter((_, i) => i !== index)); // Убираем строку поиска
                setShowDropdown(false);
            })
            .catch(() => console.error("Chyba pri načítaní položky"));
    };

    const handleSupplierChange = (event) => {
        const value = event.target.value;
        setSupplier(value);

        if (value.length > 1) {
            fetch(`/search_supplier?query=${value}`)
                .then(response => response.json())
                .then(data => {
                    setSupplierSuggestions(data);
                })
                .catch(() => setSupplierSuggestions([]));
        } else {
            setSupplierSuggestions([]);
        }
    };

    const handleSelectSupplier = (selectedSupplier) => {
        setSupplier(selectedSupplier);
        setShowSupplierDropdown(false);
    };

    const handleAddRow = () => {
        setRows([...rows, ""]);
    };

    const getYesterdayDate = () => {
        const today = new Date();
        today.setDate(today.getDate() - 1); // Отнимаем один день
        return today.toISOString().split('T')[0];
    };

    const handleSupplierBlur = () => {
        // Закрываем список через небольшой таймаут, чтобы успел сработать клик по пункту
        setTimeout(() => setShowSupplierDropdown(false), 200);
    };
    
    const handleSupplierFocus = () => {
        if (supplier.length > 1) {
            fetch(`/search_supplier?query=${supplier}`)
                .then(response => response.json())
                .then(data => {
                    setSupplierSuggestions(data);
                    if (data.length > 0) {
                        setShowSupplierDropdown(true);
                    }
                })
                .catch(() => setSupplierSuggestions([]));
        }
    };
    

    const handleUpdateNaskladnenie = async () => {
        setErrorMessage(null);
    
        if (!id) {
            setErrorMessage("Chýba ID naskladnenia.");
            return;
        }
    
        if (selectedItems.some(item => parseFloat(item.quantity) === 0)) {
            setErrorMessage("Množstvo nesmie byť 0.");
            return;
        }      
    
        const supplier = document.querySelector('.formRow .supplierField')?.value || null;
        const documentNumber = document.querySelector('.formRow .inputField:nth-of-type(2)')?.value || null;
        const note = document.querySelector('.formRow textarea')?.value || null;
        const cenaDPH = selectedItems.reduce((acc, item) => acc + parseFloat(item.totalPriceWithDph), 0).toFixed(2);
        const fullDateTime = `${date}T${time}`;
    
        try {
            // Обновляем существующее naskladnenie
            const response = await fetch('/api/update_naskladnenie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, date: fullDateTime, supplier, documentNumber, cenaDPH, note })
            });
    
            const result = await response.json();
            if (!result.success) {
                setErrorMessage(`Chyba pri aktualizácii: ${result.error}`);
                return;
            }
    
            // Удаляем старые položky перед добавлением новых
            await fetch('/api/delete_naskladnenie_polozky', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ naskladnenie_id: id })
            });
    
            // Добавляем všetky položky k existujúcemu naskladneniu
            await Promise.all(selectedItems.map(async (item) => {
                const itemData = {
                    naskladnenie_id: id,  // Используем существующий ID
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
            
        } catch (error) {
            setErrorMessage(`Chyba pri aktualizácii naskladnenia: ${error.message}`);
        }
    };    

    const handleUpdateAndRedirect = async () => {
        await handleUpdateNaskladnenie();
        window.location.href = "/naskladnenie";
    };

    const totalWithoutDph = selectedItems.reduce((acc, item) => acc + parseFloat(item.totalPriceWithoutDph || 0), 0).toFixed(2);
    const totalWithDph = selectedItems.reduce((acc, item) => acc + parseFloat(item.totalPriceWithDph || 0), 0).toFixed(2);

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
                        <p>Upraviť naskladnenie</p>
                    </div>
                </div>
                <div className="mainPlace">
                    <div className="formContainer">
                        <div className="formRow">
                            <p>Dátum</p>
                            <div className="buttonGroup">
                                <input className="inputField" type="date" value={date} max={getYesterdayDate()} onChange={(e) => setDate(e.target.value)} />
                            </div>
                            <p>Dodávateľ</p>
                            <div className="supplier-container">
                                <input 
                                    className="inputField supplierField"
                                    type="text" 
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
                            <input className="inputField" type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
                            <p>Poznámka</p>
                            <textarea className="inputField" value={note} onChange={(e) => setNote(e.target.value)}></textarea>
                        </div> 
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
                                                    <span className="unitSuffix">ks</span>
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
                        <div className="bottomBlock">
                            <button onClick={handleUpdateAndRedirect}>
                                Uložiť
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
