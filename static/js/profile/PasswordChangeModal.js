const { useState } = React;

function PasswordChangeModal({ isOpen, onClose }) {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [confirmationStep, setConfirmationStep] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!confirmationStep) {
            if (!oldPassword || !newPassword || !repeatPassword) {
                alert("Vyplňte prosím všetky polia.");
                return;
            }
            if (newPassword.length < 8) {
                alert("Nové heslo musí mať aspoň 8 znakov.");
                return;
            }
            if (newPassword === oldPassword) {
                alert("Nové heslo sa nemôže zhodovať so starým.");
                return;
            }
            if (newPassword !== repeatPassword) {
                alert("Nové heslá sa nezhodujú.");
                return;
            }
            setConfirmationStep(true);
        } else {
            try {
                const res = await fetch('/api/change_password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        old_password: oldPassword,
                        new_password: newPassword,
                        repeat_password: repeatPassword
                    })
                });

                const data = await res.json();
                if (data.success) {
                    alert("Heslo bolo úspešne zmenené.");
                    onClose();
                } else {
                    alert("Chyba: " + data.error);
                    setConfirmationStep(false);
                }
            } catch (err) {
                console.error("Chyba pri zmene hesla:", err);
                alert("Nastala chyba pri komunikácii so serverom.");
                setConfirmationStep(false);
            }
        }
    };

    return (
        <div className="password-modal-overlay">
            <div className="password-modal-content">
                <div className="password-modal-header">
                    <h2>Zmeniť heslo</h2>
                    <button className="password-close-btn" onClick={onClose}>✖</button>
                </div>

                <div className="password-modal-body">
                    {!confirmationStep ? (
                        <>
                            <label>Staré heslo</label>
                            <input 
                                type="password" 
                                value={oldPassword} 
                                onChange={(e) => setOldPassword(e.target.value)} 
                            />

                            <label>Nové heslo</label>
                            <input 
                                type="password" 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                            />

                            <label>Opakujte nové heslo</label>
                            <input 
                                type="password" 
                                value={repeatPassword} 
                                onChange={(e) => setRepeatPassword(e.target.value)} 
                            />
                        </>
                    ) : (
                        <p>Ste si istý, že chcete zmeniť heslo?</p>
                    )}
                </div>

                <div className="password-modal-footer">
                    <button className="password-save-btn" onClick={handleSubmit}>
                        {confirmationStep ? "Potvrdiť" : "Uložiť"}
                    </button>
                </div>
            </div>
        </div>
    );
}

window.PasswordChangeModal = PasswordChangeModal;
