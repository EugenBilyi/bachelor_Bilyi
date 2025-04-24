const { useEffect, useState } = React;

function App() {
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/avatars/empty_profile_logo.jpg'
    });
    const [faktury, setFaktury] = useState([]);
    const [modalData, setModalData] = useState({ open: false, id: null, cislo: '' });

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
                if (i === attempts - 1) throw err; // Если последняя попытка, пробрасываем ошибку
            }
        }
    };

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(null);
    
        const fetchData = async () => {
            try {
                const data = await fetchWithRetry('/api/get_faktury');
                if (isMounted && Array.isArray(data)) {
                    setFaktury(data);
    
                    setTimeout(() => {
                        document.querySelectorAll('.floating-badge').forEach(row => {
                            row.classList.add('stop-animation');
                        });
                    }, 2000);
                }
            } catch (err) {
                console.error("Chyba pri načítaní faktúr:", err);
                if (isMounted) setError("Chyba pri načítaní údajov. Skúste to znova.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
    
        fetchData();
    
        return () => { isMounted = false };
    }, []);

    useEffect(() => {
        let isMounted = true;
    
        const fetchProfile = async () => {
            try {
                const data = await fetchWithRetry('/api/profile_data');
                if (isMounted && data.success) {
                    setProfile(data.profile);
                } else if (isMounted) {
                    console.error('Chyba pri načítaní profilu:', data.error || 'Neznáma chyba');
                }
            } catch (err) {
                console.error('Chyba pri načítaní profilu:', err);
            }
        };
    
        fetchProfile();
    
        return () => { isMounted = false };
    }, []);    

    const formatDateNoSpaces = (dateStr) => {
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    };    

    const updateStatus = async (id) => {
        try {
            const res = await fetch('/api/update_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
    
            const data = await res.json();
    
            if (data.success) {
                setFaktury(prev =>
                    prev.map(f =>
                        f.id === id
                            ? { ...f, stav: 'Zaplatena', po_splatnosti: data.po_splatnosti }
                            : f
                    )
                );
            } else {
                console.error("Chyba pri zmene stavu faktúry:", data.error);
            }
        } catch (err) {
            console.error("Chyba pri zmene stavu faktúry:", err);
        }
    };    

    const handleExportCSV = () => {
        if (!faktury.length) {
            alert('Nie sú dostupné žiadne údaje na export.');
            return;
        }
    
        const headers = ["Číslo", "Dátum vystavenia", "Cena", "Dátum splatnosti", "Stav"];
        const rows = faktury.map(faktura => [
            faktura.cislo,
            new Date(faktura.datum_vystavenia).toLocaleDateString('sk-SK'),
            `${faktura.cena.toFixed(2)} €`,
            new Date(faktura.datum_splatnosti).toLocaleDateString('sk-SK'),
            faktura.stav === "Zaplatena"
                ? (faktura.po_splatnosti ? "Zaplatená (po splatnosti)" : "Zaplatená")
                : "Nezaplatená"
        ]);
    
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 20 }];
    
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Faktúry');
        XLSX.writeFile(wb, 'Faktury.xlsx');
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
                        <li><a href = "/uctenky">ÚČTY</a>
                            <ul>
                                <li><a href="/uctenky">Účtenky</a></li>
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
                        <li className = 'fakturacie'><a href = "/faktury">FAKTURÁCIE</a>
                            <ul>
                                <li className="current"><a href="/faktury">Faktúry</a></li>
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
                        <li className="current"><a href="/faktury">Faktúry</a></li>
                    </ul>
                </div>
                <div className="pageName">
                    <p>Faktúry</p>
                </div>
            </div>


            <div className="mainPlace">
                {faktury.map((faktura, index) => {
                    const dnes = new Date();
                    const splatnost = new Date(faktura.datum_splatnosti);
                    const jePoSplatnosti = faktura.stav === "Nezaplatena" && splatnost < dnes;

                    return (
                        faktura.stav === "Nezaplatena" && (
                            <div
                                className={`floating-badge ${jePoSplatnosti ? 'overdue' : ''}`}
                                style={{ top: `${145 + index * 45}px` }}
                                key={`badge-${index}`}
                            >
                                {jePoSplatnosti ? 'Po dátume splatnosti' : 'Nezaplatená faktúra'}
                            </div>
                        )
                    );
                })}
                <div className="tableCategories">
                    <ul className="headerUl">
                        <table>
                            <thead>
                                <tr>
                                    <td colSpan="5">
                                        <div className="buttonContainer">
                                            <button onClick={handleExportCSV}>Export do .csv</button>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Číslo</td>
                                    <td>Dátum vystavenia</td>
                                    <td>Cena</td>
                                    <td>Dátum splatnosti</td>
                                    <td>Stav</td>
                                </tr>
                            </thead>
                            <tbody>
                                {faktury.map((faktura, index) => (
                                    <tr key={index} className={(() => {
                                        if (faktura.stav === 'Zaplatena' && faktura.po_splatnosti) return 'overdue-row';
                                        if (faktura.stav === 'Nezaplatena') {
                                            const jePoSplatnosti = new Date(faktura.datum_splatnosti) < new Date();
                                            return jePoSplatnosti ? 'unpaid-row overdue-row' : 'unpaid-row';
                                        }
                                        return '';
                                    })()}>
                                                                                                     
                                        <td>
                                            {faktura.cislo}
                                        </td>
                                        <td>{formatDateNoSpaces(faktura.datum_vystavenia)}</td>
                                        <td>{faktura.cena.toFixed(2)} €</td>
                                        <td>{formatDateNoSpaces(faktura.datum_splatnosti)}</td>
                                        <td>
                                            {faktura.stav === "Zaplatena" ? (
                                                faktura.po_splatnosti ? "Zaplatená (po splatnosti)" : "Zaplatená"
                                            ) : (
                                                <i className="fa-solid fa-square-check"
                                                onClick={() => setModalData({ open: true, id: faktura.id, cislo: faktura.cislo })}
                                                ></i>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ul>
                </div>                
            </div>
            {modalData.open && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <p>Naozaj si prajete označiť faktúru s číslom <b>{modalData.cislo}</b> ako zaplatenú?</p>
                        <div className="modal-buttons">
                            <button
                                className="confirm"
                                onClick={() => {
                                    updateStatus(modalData.id);
                                    setModalData({ open: false, id: null, cislo: '' });
                                }}
                            >
                                Áno, označiť ako zaplatenú
                            </button>
                            <button
                                className="cancel"
                                onClick={() => setModalData({ open: false, id: null, cislo: '' })}
                            >
                                Zrušiť
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


ReactDOM.render(<App />, document.getElementById('app'));