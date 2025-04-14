const { useEffect, useState } = React;

function NovaSkladovaKarta({ onClose }) {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [unit, setUnit] = useState([]);
    const [dphRate, setDphRate] = useState(0);
    const [priceWithDph, setPriceWithDph] = useState(0);
    const [priceWithoutDph, setPriceWithoutDph] = useState(0);
    const [nazovKarty, setNazovKarty] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [newUnit, setNewUnit] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const user = userData ? JSON.parse(userData) : null;
        if (!user) return;

        fetch('/items', {
            headers: {
                'Authorization': `Bearer ${user.email}`
            }
        })
        .then(res => res.json())
        .then(data => {
            setItems(data);
            setUnit([...new Set(data.map(i => i.unit))]);
        });

        fetch('/categories_api', {
            headers: {
                'Authorization': `Bearer ${user.email}`
            }
        })
        .then(res => res.json())
        .then(data => {
            setCategories([...new Set(data.map(i => i.category))]);
        });
    }, []);

    const handlePriceWithDphChange = e => {
        const val = e.target.value;
        if (!/^\d*\.?\d*$/.test(val)) return;
        setPriceWithDph(val);
        setPriceWithoutDph((parseFloat(val || 0) / (1 + dphRate / 100)).toFixed(2));
    };

    const handlePriceWithoutDphChange = e => {
        const val = e.target.value;
        if (!/^\d*\.?\d*$/.test(val)) return;
        setPriceWithoutDph(val);
        setPriceWithDph((parseFloat(val || 0) * (1 + dphRate / 100)).toFixed(2));
    };

    const handleDphChange = e => {
        const rate = parseFloat(e.target.value) || 0;
        setDphRate(rate);
        setPriceWithoutDph((priceWithDph / (1 + rate / 100)).toFixed(2));
    };

    const handleCreate = () => {
        if (!nazovKarty.trim() || (!selectedCategory && !newCategory.trim()) || (!selectedUnit && !newUnit.trim())) {
            alert("Vyplňte všetky povinné polia.");
            return;
        }
        if (newCategory && categories.includes(newCategory)) {
            alert("Kategória už existuje."); return;
        }
        if (newUnit && unit.includes(newUnit)) {
            alert("Jednotka už existuje."); return;
        }
        if (dphRate === 0 || priceWithDph <= 0 || priceWithoutDph <= 0) {
            alert("Zadajte platné ceny a DPH.");
            return;
        }

        const data = {
            nazov: nazovKarty,
            pocet: 0.00,
            cena_s_dph: parseFloat(priceWithDph),
            cena_bez_dph: parseFloat(priceWithoutDph),
            jednotka: newUnit || selectedUnit,
            kategoria: newCategory || selectedCategory
        };

        fetch('/new_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => {
            if (res.ok) {
                alert("Nová karta bola vytvorená.");
                onClose();
            } else {
                alert("Chyba pri vytváraní karty.");
            }
        });
    };

    return (
        <div className="nsk-modal-overlay">
            <div className="nsk-modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="nsk-columns-container">
                    <div className="nsk-column">
                        <p>Názov karty</p>
                        <input type="text" value={nazovKarty} onChange={e => setNazovKarty(e.target.value)} />
                        <p>Vyberte kategóriu</p>
                        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                            <option value="">Nezaradené</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nová kategória" />
                    </div>

                    <div className="nsk-column">
                        <p>Sadzba DPH</p>
                        <select onChange={handleDphChange}>
                            <option value="0">Vyberte DPH</option>
                            <option value="5">5%</option>
                            <option value="19">19%</option>
                            <option value="20">20%</option>
                            <option value="23">23%</option>
                        </select>
                        <p>Jednotka</p>
                        <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}>
                            <option value="">Vyberte jednotku</option>
                            {["ks","l","dl","cl","ml","kg","g","cm","m"].map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                        <input type="text" value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="Nová jednotka" />
                        <div className="nsk-priceBlock">
                            <div className="nsk-priceInput">
                                <p>Cena s DPH</p>
                                <div>
                                    <input type="text" value={priceWithDph} onChange={handlePriceWithDphChange} />
                                    <span>€</span>
                                </div>
                            </div>
                            <div className="nsk-priceInput">
                                <p>Cena bez DPH</p>
                                <div>
                                    <input type="text" value={priceWithoutDph} onChange={handlePriceWithoutDphChange} />
                                    <span>€</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {errorMessage && <p className="nsk-error-message">{errorMessage}</p>}
                <footer style={{ marginTop: '20px' }} className="nsk-footer">
                    <div className="nsk-cancel" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                        <span>Zrušiť</span>
                    </div>
                    <div className="nsk-confirm" onClick={handleCreate}>
                        <i className="fa-solid fa-check"></i>
                        <span>Vytvoriť</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

window.NovaSkladovaKarta = NovaSkladovaKarta;