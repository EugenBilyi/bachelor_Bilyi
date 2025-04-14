const { useEffect, useState } = React;

function App(){
    const [inventories, setInventories] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [uctenka, setUctenka] = useState(null);
    const [polozky, setPolozky] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/avatars/empty_profile_logo.jpg'
    });

    const predajId = localStorage.getItem("predaj_id");

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
        const loadData = async () => {
            try {
                if (!predajId) throw new Error("predaj_id nie je definované.");
                const [uctenkaData, polozkyData] = await Promise.all([
                    fetchWithRetry(`/api/get_predaj?id=${predajId}`),
                    fetchWithRetry(`/api/get_predaj_polozky?predaj_id=${predajId}`)
                ]);

                setUctenka(uctenkaData.predaj);;
                setPolozky(polozkyData);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        const loadProfile = async () => {
            try {
                const data = await fetchWithRetry('/api/profile_data');
                if (data.success) {
                    setProfile(data.profile);
                } else {
                    throw new Error(data.error || 'Chyba pri načítaní profilu');
                }
            } catch (err) {
                setError(err.message);
            }
        };

        loadProfile();
        loadData();
    }, []);

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

    return(
        <div>
            <header>
                <a href = "/skladove_karty" className = "logo">Skladový systém</a>

                <nav>
                    <ul>
                        <li className = 'ucty'><a href = "/uctenky">ÚČTY</a>
                            <ul>
                                <li className="current"><a href="/uctenky">Účtenky</a></li>
                            </ul>
                        </li>
                        <li><a href = "/skladove_karty">SKLADY</a>
                            <ul>
                                <li><a href = "/skladove_karty">Skladové karty</a></li>
                                <li><a href = "/categories">Kategórie skladových kariet</a></li>
                                <li><a href = "/naskladnenie">Naskladnenie</a></li>
                                <li><a href = "/inventury">Inventúry</a></li>
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
                        <li className="current"><a href="/uctenky">Účtenky</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <div>
                        <i className="fa-solid fa-arrow-left" onClick={() => window.location.href = '/uctenky'}></i>
                        <p>Detail účtenky</p>
                    </div>
                </div>
            </div>

            <div className="mainPlace">
                {uctenka && (
                    <div className="infoTable">
                        <table>
                            <thead>
                                <tr>
                                    <th>Číslo účtu</th>
                                    <th>Dátum</th>
                                    <th>Stôl</th>
                                    <th>Cena</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{uctenka.cislo_uctu}</td>
                                    <td>{uctenka.datum.split("T")[0]}</td>
                                    <td>{uctenka.stol}</td>
                                    <td>{uctenka.cena.toFixed(2)} €</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                <h2 className="categoryTitle">Položky účtenky</h2>

                <div className="categoryTable">
                    <table>
                        <thead>
                            <tr>
                                <th>Názov položky</th>
                                <th>Počet</th>
                                <th>Jednotková cena</th>
                                <th>Cena</th>
                            </tr>
                        </thead>
                        <tbody>
                            {polozky.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.nazov_polozky}</td>
                                    <td>{item.pocet}</td>
                                    <td>{item.jednotkova_cena.toFixed(2)} €</td>
                                    <td>{item.cena.toFixed(2)} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

ReactDOM.render(<App />, document.getElementById('app'));