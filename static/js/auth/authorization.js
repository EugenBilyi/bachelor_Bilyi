function App() {
    const [errorMessage, setErrorMessage] = React.useState('');

    const [showPassword, setShowPassword] = React.useState(false);

    const handleAuthorisation = (event) => {
        event.preventDefault();
    
        const form = event.target;
        const email = form.elements.email.value;
        const password = form.elements.password.value;
    
        fetch('/authorize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user)); // Сохраняем данные пользователя
                window.location.href = '/skladove_karty';
            } else {
                setErrorMessage('Error: ' + data.message);
            }
        })
        .catch(error => {
            setErrorMessage('An error occurred during authorization.');
            console.error(error);
        });
    };
    

    const handleCheckboxChange = () =>{
        setShowPassword(!showPassword);
    };

    return (
        <div>
            <div className='divText'>
                <h1>Skladový systém</h1>
            </div>
            <div className='wrapper'>
                <form onSubmit={handleAuthorisation}>
                    <h1>Prihlásenie</h1>
                    <div className='input-box'>
                        <input type='email' name='email' placeholder='Email' required />
                        <i className='fa-regular fa-envelope icon'></i>
                    </div>
                    
                    <div className='input-box'>
                        <input type={showPassword ? 'text' : 'password'} 
                            name='password' 
                            placeholder='Heslo' 
                            required />
                        <i className={showPassword ? 'fa-solid fa-lock-open icon' : 'fa-solid fa-lock icon'}></i>
                    </div>

                    <label className='labelCheckbox'>
                        <input type='checkbox' checked={showPassword} onChange={handleCheckboxChange} />
                        Zobraziť heslo
                    </label>

                    <p className='errorTag' style={{color: 'red'}}>{errorMessage}</p>

                    <button type='submit'>Prihlásiť sa</button>

                    <div className='register-link'>
                        <p>Nemáte účet? <a href='/register_page'>Zaregistrujte sa</a></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
