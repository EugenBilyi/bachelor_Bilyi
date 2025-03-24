const { useEffect, useState } = React;

function App() {
    const [product, setProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [dphRate, setDphRate] = useState(0);
    const [priceWithDph, setPriceWithDph] = useState(0);
    const [priceWithoutDph, setPriceWithoutDph] = useState(0);
    const [productName, setProductName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

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
            setError("Chýbajúce údaje o používateľovi.");
            setIsLoading(false);
            return;
        }
    
        const loadData = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const productNameParam = urlParams.get('product_name');
    
                const [categoriesData, itemsData] = await Promise.all([
                    fetchWithRetry('/categories_api'),
                    fetchWithRetry('/items')
                ]);
    
                if (isMounted) {
                    const uniqueCategories = [...new Set(categoriesData.map(item => item.category))];
                    const uniqueUnits = [...new Set(itemsData.map(item => item.unit))];
                    setCategories(uniqueCategories);
                    setUnits(uniqueUnits);
                }
    
                if (productNameParam) {
                    const itemData = await fetchWithRetry(`/item?product_name=${encodeURIComponent(productNameParam)}`);
    
                    if (isMounted) {
                        if (itemData.error) {
                            setErrorMessage(itemData.error);
                        } else {
                            setProduct(itemData);
                            setProductName(itemData.product_name);
                            setDphRate(parseFloat(itemData.DPH) || 0);
                            setPriceWithDph(parseFloat(itemData.cenaDPH) || 0);
                            setPriceWithoutDph((parseFloat(itemData.cenaDPH) / (1 + (parseFloat(itemData.DPH) / 100))).toFixed(2) || 0);
                            setSelectedCategory(itemData.category);
                            setSelectedUnit(itemData.unit);
                            setQuantity(parseFloat(itemData.quantity) || 0);
                        }
                    }
                }
            } catch (err) {
                console.error("Chyba pri načítaní údajov:", err);
                if (isMounted) {
                    setError("Chyba pri načítaní údajov. Skúste to znova.");
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
    
        loadData();
    
        return () => {
            isMounted = false;
        };
    }, []);
    

    const handlePriceWithDphChange = (event) => {
        let value = event.target.value;
    
        // Разрешаем вводить только цифры и одну точку
        if (!/^\d*\.?\d*$/.test(value)) return;
    
        setPriceWithDph(value);
        const calculatedPriceWithoutDph = parseFloat(value || 0) / (1 + dphRate / 100);
        setPriceWithoutDph(calculatedPriceWithoutDph.toFixed(2));
    };
    
    const handlePriceWithoutDphChange = (event) => {
        let value = event.target.value;
    
        // Разрешаем вводить только цифры и одну точку
        if (!/^\d*\.?\d*$/.test(value)) return;
    
        setPriceWithoutDph(value);
        const calculatedPriceWithDph = parseFloat(value || 0) * (1 + dphRate / 100);
        setPriceWithDph(calculatedPriceWithDph.toFixed(2));
    };
    

    const handleSave = () => {
        if (!product) return;
    
        const data = {
            old_product_name: product.product_name, // Оригинальное имя
            new_product_name: productName.trim() || product.product_name, // Если поле пустое, оставляем старое
            category: selectedCategory,
            unit: selectedUnit,
            quantity: quantity,
            cenaDPH: priceWithDph,
            cenaBezDPH: priceWithoutDph,
            DPH: dphRate
        };
    
        fetch('/update_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert("Skladová karta bola úspešne aktualizovaná.");
                window.close();
            } else {
                alert("Chyba pri aktualizácii skladovej karty: " + result.error);
            }
        })
        .catch(error => {
            console.error('Chyba pri aktualizácii položky:', error);
            alert("Chyba pri aktualizácii skladovej karty.");
        });
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
                <div>
                    <img src="/static/Components/assets/head_icon.png" />
                    <h2>Upraviť skladovú kartu</h2>
                </div>
            </header>

            {product ? (
                <div className="columns-container">
                    <div className="column">
                        <p>Názov karty</p>
                        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} />

                        <p>Kategória</p>
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>

                        <p>Počet</p>
                        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    </div>

                    <div className="column">
                        <p>Sadzba DPH</p>
                        <select value={dphRate} onChange={(e) => setDphRate(e.target.value)}>
                            <option value="0">Vyberte DPH</option>
                            <option value="5">5%</option>
                            <option value="19">19%</option>
                            <option value="20">20%</option>
                            <option value="23">23%</option>
                        </select>

                        <p>Jednotka</p>
                        <select className="selectUnit" value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
                            <option value="">Vyberte jednotku</option>
                            <option value="ks">ks</option>
                            <option value="l">l</option>
                            <option value="dl">dl</option>
                            <option value="cl">cl</option>
                            <option value="ml">ml</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="cm">cm</option>
                            <option value="m">m</option>
                        </select>

                        <div className="priceBlock">
                            <div className="priceInput">
                                <p>Cena s DPH</p>
                                <div className="blockInput">
                                    <input type="text" value={priceWithDph} onChange={handlePriceWithDphChange} />
                                    <span>€</span>
                                </div>
                            </div>
                            <div className="priceInput">
                                <p>Cena bez DPH</p>
                                <div className="blockInput">
                                    <input type="text" value={priceWithoutDph} onChange={handlePriceWithoutDphChange} />
                                    <span>€</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="error-message">{errorMessage}</p>
            )}

            <footer>
                <div className="closeButton" onClick={() => window.close()}>
                    <i className="fa-solid fa-xmark"></i>
                    <span>Zrušiť</span>
                </div>
                <div className="acceptButton" onClick={handleSave}>
                    <i className="fa-solid fa-check"></i>
                    <span>Uložiť</span>
                </div>
            </footer>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
