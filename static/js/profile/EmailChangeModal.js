const { useState } = React;

function EmailChangeModal({ isOpen, onClose, currentEmail }) {
    const [oldEmail, setOldEmail] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [confirmationStep, setConfirmationStep] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!confirmationStep) {
            if (!oldEmail || !newEmail) {
                alert("Vyplňte prosím všetky polia.");
                return;
            }
            if (oldEmail !== currentEmail) {
                alert("Zadaný starý e-mail nezodpovedá aktuálnemu.");
                return;
            }
            setConfirmationStep(true);
        } else {
            try {
                const response = await fetch('/api/change_email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        old_email: oldEmail,
                        new_email: newEmail
                    })
                });
    
                const data = await response.json();
    
                if (data.success) {
                    alert(`Email úspešne zmenený na: ${newEmail}`);
                    onClose();
                    window.location.reload(); // оновимо дані на сторінці (можна замінити на useEffect або fetch)
                } else {
                    alert(`Chyba: ${data.error}`);
                }
            } catch (error) {
                alert("Nastala chyba pri komunikácii so serverom.");
                console.error("Chyba:", error);
            }
        }
    };    

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Zadať nový email</h2>
                    <button className="close-btn" onClick={onClose}>✖</button>
                </div>

                <div className="modal-body">
                    {!confirmationStep ? (
                        <>
                            <label>Starý email</label>
                            <input 
                                type="email" 
                                value={oldEmail} 
                                onChange={(e) => setOldEmail(e.target.value)} 
                            />

                            <label>Nový email</label>
                            <input 
                                type="email" 
                                value={newEmail} 
                                onChange={(e) => setNewEmail(e.target.value)} 
                            />
                        </>
                    ) : (
                        <p>Ste si istý, že chcete zmeniť email na <strong>{newEmail}</strong>?</p>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="save-btn" onClick={handleSubmit}>
                        {confirmationStep ? "Potvrdiť" : "Uložiť"}
                    </button>
                </div>
            </div>
        </div>
    );
}

window.EmailChangeModal = EmailChangeModal;