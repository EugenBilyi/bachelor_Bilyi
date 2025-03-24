const { useEffect, useState } = React;

function App() {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [unit, setUnit] = useState([]);
    const [dphRate, setDphRate] = useState(0);
    const [priceWithDph, setPriceWithDph] = useState(0);
    const [priceWithoutDph, setPriceWithoutDph] = useState(0);
    const [nazovKarty, setNazovKarty] = useState('');
    // const [pocet, setPocet] = useState('0.00');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [newUnit, setNewUnit] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Загружаем данные для items
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

        fetch('/items', {
            headers: {
                'Authorization': `Bearer ${user?.email || ''}`
            }
        })
        .then(response => response.json())
        .then(data => {
            setItems(data);
            const uniqueUnit = [...new Set(data.map(item => item.unit))];
            setUnit(uniqueUnit);
        })
        .catch(error => console.error('Error fetching items:', error));
    }, []);

    // Загружаем данные для категорий
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

        fetch('/categories_api', {
            headers: {
                'Authorization': `Bearer ${user.email}`
            }
        })
        .then(response => response.json())
        .then(data => {
            const uniqueCategories = [...new Set(data.map(item => item.category))];
            setCategories(uniqueCategories);
        })
        .catch(error => console.error('Error fetching categories:', error));
    }, []);

    const handlePriceWithDphChange = (event) => {
        let value = event.target.value;
        if (!/^\d*\.?\d*$/.test(value)) return;
        setPriceWithDph(value);
        const calculatedPriceWithoutDph = parseFloat(value || 0) / (1 + dphRate / 100);
        setPriceWithoutDph(calculatedPriceWithoutDph.toFixed(2));
    };
    
    const handlePriceWithoutDphChange = (event) => {
        let value = event.target.value;
        if (!/^\d*\.?\d*$/.test(value)) return;
        setPriceWithoutDph(value);
        const calculatedPriceWithDph = parseFloat(value || 0) * (1 + dphRate / 100);
        setPriceWithDph(calculatedPriceWithDph.toFixed(2));
    };
    

    const handleDphChange = (event) => {
        const rate = parseFloat(event.target.value) || 0;
        setDphRate(rate);
        const recalculatedPriceWithoutDph = priceWithDph / (1 + rate / 100);
        setPriceWithoutDph(recalculatedPriceWithoutDph.toFixed(2));
    };

    const handleCreate = () => {
        // Проверка обязательных полей
        if (!nazovKarty.trim()) {
            alert("Pole 'Názov karty' je povinné.");
            return;
        }

        if (!selectedCategory && !newCategory.trim()) {
            alert("Vyberte kategóriu zo zoznamu alebo zadajte novú kategóriu.");
            return;
        }

        if (!selectedUnit && !newUnit.trim()) {
            alert("Vyberte jednotku zo zoznamu alebo zadajte novú jednotku.");
            return;
        }

        // Проверка существования новой категории или единицы
        if (newCategory && categories.includes(newCategory)) {
            alert("Kategória už existuje.");
            return;
        }

        if (newUnit && unit.includes(newUnit)) {
            alert("Jednotka už existuje.");
            return;
        }

        if (dphRate === 0) {
            alert("Vyberte sadzbu DPH.");
            return;
        }
    
        if (priceWithDph <= 0) {
            alert("Cena s DPH je povinná.");
            return;
        }
    
        if (priceWithoutDph <= 0) {
            alert("Cena bez DPH je povinná.");
            return;
        }

        // Данные для новой складовой карты
        const data = {
            nazov: nazovKarty,
            pocet: 0.00,
            cena_s_dph: parseFloat(priceWithDph),
            cena_bez_dph: parseFloat(priceWithoutDph),
            jednotka: newUnit || selectedUnit,
            kategoria: newCategory || selectedCategory
        };

        // Отправка данных на сервер
        fetch('/new_item', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                setErrorMessage('');
                alert("Nová skladová karta bola úspešne vytvorená.");
                window.close();
            } else {
                alert("Došlo k chybe pri vytváraní skladovej karty.");
            }
        })
        .catch(error => {
            console.error('Error creating item:', error);
            alert("Došlo k chybe pri vytváraní skladovej karty.");
        });
    };

    return (
        <div>
            <header>
                <div>
                    <img src="/static/Components/assets/head_icon.png" />
                    <h2>Nová skladová karta</h2>
                </div>
            </header>

            <div className="columns-container">
                <div className="column">
                    <p>Názov karty</p>
                    <input type="text" value={nazovKarty} onChange={(e) => setNazovKarty(e.target.value)} placeholder="Zadajte názov karty" />

                    <p>Vyberte kategóriu</p>
                    <select className="selectCategory" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                        <option value="">Nezaradené</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                    <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Zadajte novú kategóriu" />
                </div>

                <div className="column">
                    <p>Sadzba DPH</p>
                    <select onChange={handleDphChange}>
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
                    <input type="text" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Zadajte novú jednotku" />

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

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            <footer>
                <div className="closeButton" onClick={() => window.close()}>
                    <i className="fa-solid fa-xmark"></i>
                    <span>Zrušiť</span>
                </div>
                <div className="acceptButton" onClick={handleCreate}>
                    <i className="fa-solid fa-check"></i>
                    <span>Vytvoriť</span>
                </div>
            </footer>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
