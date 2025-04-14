const { useState } = React;

function PredajModal({ isOpen, onClose }) {
    const [rows, setRows] = useState([
        { nazov: '', pocet: '', stol: 'stol1', cena: 0 }
    ]);    
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);


    if (!isOpen) return null;

    const handleInputChange = (index, field, value) => {
        const updated = [...rows];
    
        if (field === 'pocet') {
            const item_category = updated[index].kategoria;    
            // Якщо не Alkohol або Kava — заборонити десяткові
            if (item_category !== 'Alkohol' && item_category !== 'Kava') {
                if (!/^\d*$/.test(value)) return;  // дозволити тільки цілі
            } else {
                if (!/^\d*\.?\d*$/.test(value)) return; // дозволити десяткові
            }
        }
    
        updated[index][field] = value;
        setRows(updated);
    
        if (field === 'nazov') {
            setActiveRowIndex(index);

            if (value.length > 1) {
                fetch(`/search_polozka?query=${value}`)
                    .then(res => res.json())
                    .then(data => {
                        setSuggestions(data);
                        setShowDropdown(true);
                    })
                    .catch(err => console.error("Error fetching suggestions:", err));
            } else {
                setShowDropdown(false);
            }
        }
    };    

    const handleSelectSuggestion = (index, selected) => {
        fetch(`/get_polozka_data?name=${encodeURIComponent(selected)}`)
            .then(res => res.json())
            .then(data => {
                const updated = [...rows];
                updated[index].nazov = selected;
                updated[index].cena = data.cenaDPH || 0;
                updated[index].kategoria = data.category || ''; 
                updated[index].unit = data.unit || '';
                
                const isLastRow = index === rows.length - 1;
                const newRows = isLastRow
                    ? [...updated, { nazov: '', pocet: '', stol: 'stol1', cena: 0 }]
                    : updated;
    
                setRows(newRows);
                setSuggestions([]);
                setShowDropdown(false);
                setActiveRowIndex(null);
            })
            .catch(err => console.error("Chyba pri načítaní položky:", err));
    };     

    const submitPredajToServer = async (validRows) => {
        // Групуємо позиції по столах
        const groupedByStol = {};
        validRows.forEach(row => {
            if (!groupedByStol[row.stol]) groupedByStol[row.stol] = [];
            groupedByStol[row.stol].push({
                nazov: row.nazov,
                pocet: parseFloat(row.pocet),
                cena: parseFloat(row.cena),
            });
        });
    
        try {
            const response = await fetch('/submit_predaj', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grouped: groupedByStol })
            });
    
            const result = await response.json();
            if (result.success) {
                alert("✅ Predaj úspešný.");
                socket.emit("update_items");
                onClose();
                setRows([{ nazov: '', pocet: '', stol: 'stol1', cena: 0 }]);
            }
            else {
                alert("❌ Chyba pri ukladaní predaja.");
            }
        } catch (error) {
            console.error("Submit error:", error);
            alert("❌ Serverová chyba pri ukladaní predaja.");
        }
    };    

    const handlePredaj = async () => {
        const validRows = rows.filter(row => row.nazov.trim() !== '');
    
        if (validRows.length === 0) {
            alert("Nie sú vyplnené žiadne položky.");
            return;
        }
    
        const polozkyData = {};
        for (const row of validRows) {
            try {
                const res = await fetch(`/get_polozka_data?name=${encodeURIComponent(row.nazov)}`);
                const data = await res.json();
    
                if (data.error) {
                    alert(`Položka '${row.nazov}' neexistuje v sklade.`);
                    return;
                }
    
                polozkyData[row.nazov] = data;
            } catch (err) {
                console.error(`Chyba pri overovaní položky ${row.nazov}:`, err);
                alert(`Nepodarilo sa overiť položku: ${row.nazov}`);
                return;
            }
        }
    
        const quantityMap = {};
    
        for (const row of validRows) {
            const nazov = row.nazov;
            const pocet = parseFloat(row.pocet);
    
            if (isNaN(pocet) || pocet <= 0) {
                alert(`Zadajte platné množstvo pre položku '${nazov}'.`);
                return;
            }
    
            quantityMap[nazov] = (quantityMap[nazov] || 0) + pocet;
        }
    
        for (const [nazov, totalRequested] of Object.entries(quantityMap)) {
            const available = parseFloat(polozkyData[nazov].quantity || 0);
            if (totalRequested > available) {
                const unit = polozkyData[nazov].unit || '';
                alert(`Na sklade nie je dostatok položky '${nazov}'. K dispozícii: ${available} ${unit}, požadované: ${totalRequested} ${unit}`);
                return;
            }
        }
        submitPredajToServer(validRows);
    };    

    const vypocetCelkovaCena = () => {
        return rows.reduce((sum, row) => {
            const pocet = parseFloat(row.pocet);
            const cena = parseFloat(row.cena);
            if (!isNaN(pocet) && !isNaN(cena) && row.nazov.trim()) {
                return sum + pocet * cena;
            }
            return sum;
        }, 0).toFixed(2);
    };    

    const vypocetCeny = (index) => {
        const mnozstvo = parseFloat(rows[index].pocet);
        const cenaJednotkova = parseFloat(rows[index].cena);
        return isNaN(mnozstvo) || isNaN(cenaJednotkova)
            ? "0.00 €"
            : `${(mnozstvo * cenaJednotkova).toFixed(2)} €`;
    };    

    return (
        <div className="predaj-modal-overlay">
            <div className="predaj-modal-content">
                <div className="predaj-modal-header">
                    <h2>Simulácia predaja</h2>
                    <button className="predaj-close-btn" onClick={onClose}>✖</button>
                </div>

                <div className="predaj-modal-body">
                    <table className="predaj-modal-table">
                        <thead>
                            <tr>
                                <th>Názov položky</th>
                                <th>Počet</th>
                                <th>Cena</th>
                                <th>Stôl</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr>
                                    <td style={{ position: 'relative' }}>
                                        <input 
                                            type="text" 
                                            value={row.nazov} 
                                            onChange={(e) => handleInputChange(index, 'nazov', e.target.value)}
                                            placeholder="Názov položky"
                                            autoComplete="off"
                                        />
                                        {showDropdown && index === activeRowIndex && suggestions.length > 0 && (
                                            <div className="autocomplete-dropdown">
                                                {suggestions.map((item, i) => (
                                                    <div key={i} className="autocomplete-item" onClick={() => handleSelectSuggestion(index, item)}>
                                                        {item}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <input 
                                            type="text" 
                                            value={row.pocet} 
                                            onChange={(e) => handleInputChange(index, 'pocet', e.target.value)}
                                            placeholder="Zadajte počet"
                                        />
                                    </td>
                                    <td>
                                    <input 
                                        type="text" 
                                        value={vypocetCeny(index)} 
                                        disabled 
                                    />
                                    </td>
                                    <td>
                                        <select value={row.stol} onChange={(e) => handleInputChange(index, 'stol', e.target.value)}>
                                            <option value="stol1">Stôl 1</option>
                                            <option value="stol2">Stôl 2</option>
                                            <option value="stol3">Stôl 3</option>
                                            <option value="stol4">Stôl 4</option>
                                            <option value="stol5">Stôl 5</option>
                                            <option value="stol6">Stôl 6</option>
                                            <option value="stol7">Stôl 7</option>
                                            <option value="stol8">Stôl 8</option>
                                            <option value="stol9">Stôl 9</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="predaj-modal-footer">
                    <div className="predaj-total">
                        Celková cena: <strong>{vypocetCelkovaCena()} €</strong>
                    </div>
                    <button className="predaj-save-btn" onClick={handlePredaj}>Predať</button>
                </div>
            </div>
        </div>
    );
}

window.PredajModal = PredajModal;