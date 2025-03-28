function App(){
    const [errorMessage, setErrorMessage] = React.useState('');

    const [showPassword, setShowPassword] = React.useState(false);

    const handleRegister = (event) => {
        event.preventDefault();
        const email = event.target.elements.email.value;
        const password = event.target.elements.password.value;
        const confirmPassword = event.target.elements.confirmPassword.value;
    
        if (password !== confirmPassword) {
            setErrorMessage('Heslá sa nezhodujú.');
            return;
        }
        if (password.length < 8) {
            setErrorMessage('Heslo musí obsahovať aspoň 8 znakov.');
            return;
        }
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/authorization_page';
            } else {
                setErrorMessage(data.message || 'Registrácia zlyhala.');
            }
        })
        .catch(error => {
            setErrorMessage('Počas registrácie došlo k chybe.');
            console.error(error);
        });
    };    

    const handleCheckboxChange = () => {
        setShowPassword(!showPassword);
    };
    

    return (
        <div>
            <div className='divText'>
                <h1>Skladový systém</h1>
            </div>
            <div className='wrapper'>
                <form onSubmit={handleRegister} noValidate>
                    <h1>Registrácia</h1>
                    <div className='input-box'>
                        <input type='text' name='email' placeholder='Email' required />
                        <i className='fa-solid fa-envelope icon'></i>
                    </div>

                    <div className='input-box'>
                        <input type={showPassword ? 'text' : 'password'} 
                            name='password' 
                            placeholder='Heslo' 
                            minLength='8'
                            title='Password must contain at least 8 characters'
                            required />
                        <i className={showPassword ? 'fa-solid fa-lock-open icon' : 'fa-solid fa-lock icon'}></i>
                    </div>
                    
                    <div className='input-box'>
                        <input className='confirmPassword' 
                            name='confirmPassword' 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder='Potvrďte heslo'
                            required />
                        <i className={showPassword ? 'fa-solid fa-lock-open icon' : 'fa-solid fa-lock icon'}></i>
                    </div>

                    <label className='labelCheckbox'>
                        <input type='checkbox' checked={showPassword} onChange={handleCheckboxChange} />
                        Zobraziť heslo
                    </label>

                    <p className='errorTag' style={{color: 'red'}}>{errorMessage}</p>

                    <button type='submit'>Registrácia</button>

                    <div className='register-link'>
                        <p>Už máte účet?<a href='/authorization_page'>Prihláste sa</a></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));