const { useState, useEffect } = React;

function App() {
    const [inventura, setInventura] = useState(null);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const inventuraId = localStorage.getItem("inventura_id");

    useEffect(() => {
        if (!inventuraId) {
            setError("Chyba: inventura_id nie je definované.");
            return;
        }

        const fetchData = async () => {
            try {
                const [inventuraData, polozkyData, itemsData] = await Promise.all([
                    fetch(`/api/inventura?id=${inventuraId}`).then(res => res.json()),
                    fetch(`/api/get_inventura_polozky?inventura_id=${inventuraId}`).then(res => res.json()),
                    fetch("/items").then(res => res.json())
                ]);

                if (inventuraData.success === false) throw new Error(inventuraData.error);
                if (polozkyData.success === false) throw new Error(polozkyData.error);

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
            } catch (err) {
                setError(`Chyba pri načítaní údajov: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [inventuraId]);

    if (isLoading) {
        return <div className="loading">Načítanie údajov...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    const nedostatok = items
        .filter(item => item.differencePrice < 0)
        .reduce((sum, item) => sum + item.differencePrice, 0)
        .toFixed(2);

    const prebytok = items
        .filter(item => item.differencePrice >= 0)
        .reduce((sum, item) => sum + item.differencePrice, 0)
        .toFixed(2);


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
