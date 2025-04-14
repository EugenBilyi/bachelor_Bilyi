const { useState, useEffect } = React;
const EmailChangeModal = window.EmailChangeModal;
const PasswordChangeModal = window.PasswordChangeModal;

function App() {
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        avatar_path: '/static/Components/assets/empty_profile_logo.jpg'
    });
    const [previewAvatar, setPreviewAvatar] = useState(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

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


    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
    
        // Прев’ю
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewAvatar(reader.result);
        };
        reader.readAsDataURL(file);
    
        // Завантаження
        const formData = new FormData();
        formData.append("avatar", file);
    
        try {
            const res = await fetch("/api/upload_avatar", {
                method: "POST",
                body: formData
            });
    
            const data = await res.json();
            if (data.success) {
                setProfile(prev => ({ ...prev, avatar_path: data.avatar_path }));
            } else {
                alert("Chyba pri nahrávaní obrázku: " + data.error);
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Nepodarilo sa nahrať avatar.");
        }
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            const fakeEvent = { target: { files: [file] } };
            handleAvatarChange(fakeEvent);
        }
    };
    
    const handleDragOver = (e) => {
        e.preventDefault();
    };
    
    const handleAvatarDelete = async () => {
        try {
            const res = await fetch("/api/delete_avatar", {
                method: "POST"
            });
    
            const data = await res.json();
            if (data.success) {
                const defaultAvatar = "/static/Components/avatars/empty_profile_logo.jpg";
                setProfile(prev => ({ ...prev, avatar_path: defaultAvatar }));
                setPreviewAvatar(null);
            } else {
                alert("Chyba pri odstraňovaní: " + data.error);
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("Nepodarilo sa odstrániť obrázok.");
        }
    };

    const handleSaveProfile = async () => {
        try {
            const res = await fetch("/api/update_profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    username: profile.username
                })
            });
    
            const data = await res.json();
            if (data.success) {
                alert("Údaje boli úspešne uložené.");
            } else {
                alert("Chyba pri ukladaní: " + data.error);
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Nepodarilo sa uložiť profil.");
        }
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

    return (
        <div>
            <header>
                <a href="/skladove_karty" className="logo">Skladový systém</a>
                <nav>
                    <ul>
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
                <div className="mainPlace">
                    <div id="appContainer">
                        <div className="container settings">
                            <h4>Nastavenie užívateľského profilu</h4>

                            <div className="row section-wrapper">
                                <div className="uploader">
                                    <div className="ui">
                                        <div className="user-thumb" onDrop={handleDrop} onDragOver={handleDragOver}>
                                            <img src={previewAvatar || profile.avatar_path} alt="avatar" />
                                        </div>
                                        <div className="buttons">
                                            <div className="btn">
                                                <input type="file" name="avatar" accept="image/*" onChange={handleAvatarChange}/>
                                                Nový profilový obrázok
                                            </div>
                                            <button className="btn" onClick={handleAvatarDelete}>Odstrániť profilový obrázok</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="section-wrapper">
                                <div className="col-xs-1">
                                    <div className="form-group">
                                        <label htmlFor="firstName">Krstné meno</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            id="firstName" 
                                            value={profile.first_name} 
                                            onChange={(e) =>
                                                setProfile((prev) => ({ ...prev, first_name: e.target.value }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="lastName">Priezvisko</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            id="lastName" 
                                            value={profile.last_name} 
                                            onChange={(e) =>
                                                setProfile((prev) => ({ ...prev, last_name: e.target.value }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="username">Užívateľské meno</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            id="username" 
                                            value={profile.username} 
                                            onChange={(e) =>
                                                setProfile((prev) => ({ ...prev, username: e.target.value }))
                                            }
                                        />
                                    </div>

                                    <div className="form-bottom">
                                        <button className="btn" onClick={handleSaveProfile}>Uložiť</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="section-wrapper">
                                <div className="col-xs-1 email-password-wrapper">
                                    <div className="form-group row-line">
                                        <div className="email-label">
                                            <label htmlFor="email">E-mail</label>
                                            <label className="email-value">{profile.email}</label>
                                        </div>
                                        <div className="email-btn">
                                            <button className="btn" onClick={() => setIsEmailModalOpen(true)}>
                                                Zadať nový email
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="password">Heslo</label>
                                    </div>
                                    <div className="form-bottom">
                                    <button className="btn" onClick={() => setIsPasswordModalOpen(true)}>
                                        Zadajte nové heslo
                                    </button>
                                    </div>
                                </div>
                                <EmailChangeModal
                                    isOpen={isEmailModalOpen}
                                    onClose={() => setIsEmailModalOpen(false)}
                                    currentEmail={profile.email}
                                />
                                <PasswordChangeModal
                                    isOpen={isPasswordModalOpen}
                                    onClose={() => setIsPasswordModalOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
