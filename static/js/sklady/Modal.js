const { useState, useEffect } = React;

function Modal({ isOpen, onClose, searchText, onSave }) {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedDPH, setSelectedDPH] = useState("5%");
    const [selectedUnit, setSelectedUnit] = useState("ks");

    useEffect(() => {
        if (isOpen) {
            fetch("/categories_api")
                .then((response) => response.json())
                .then((data) => {
                    setCategories(data);
                    if (data.length > 0) setSelectedCategory(data[0].category);
                })
                .catch((err) => console.error("Error fetching categories:", err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        fetch('/create_new_polozka', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nazov: searchText,
                kategoria: selectedCategory,
                jednotka: selectedUnit,
                dph: selectedDPH.replace('%', '') // Преобразуем "19%" в "19"
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                onSave(searchText, selectedCategory, selectedDPH, selectedUnit);
            } else {
                console.error('Error creating položka:', data.error);
            }
        })
        .catch(error => console.error('Request failed:', error));
    };
    

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Nová skladová karta</h2>
                    <button className="close-btn" onClick={onClose}>✖</button>
                </div>

                <div className="modal-body">
                    <label>Názov karty</label>
                    <input type="text" value={searchText} readOnly />

                    <label>Kategória</label>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                        {categories.map((category) => (
                            <option key={category.id} value={category.category}>{category.category}</option>
                        ))}
                    </select>

                    <label>DPH</label>
                    <select value={selectedDPH} onChange={(e) => setSelectedDPH(e.target.value)}>
                        <option value="5%">5%</option>
                        <option value="19%">19%</option>
                        <option value="23%">23%</option>
                    </select>

                    <label>Jednotka</label>
                    <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
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
                </div>

                <div className="modal-footer">
                    <button className="save-btn" onClick={handleSave}>
                        Vytvoriť
                    </button>
                </div>
            </div>
        </div>
    );
}

window.Modal = Modal;