const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/login.html', (req, res) => {
    res.sendFile(__dirname + '/login.html');
  });

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/register.html');
});

app.get('/register.html', (req, res) => {
    res.sendFile(__dirname + '/register.html');
  });

let usuarios = [];

// var register_io = io.of('/register');
// register_io.on('connection', (socket) => {
//     console.log(socket.id + ' connected');
//     message = '';
//     validate = 0;

//     socket.on('create_account', (email,username,password) => {
//         let usuario = {
//             email: email, password: password, username : username
//         };  
//         const emailExists = usuarios.some(user => user.email === email);
//         const usernameExists = usuarios.some(user => user.email === email);
//         if(emailExists) {
//             message = "Ja existe uma conta cadastrada com esse email!";
//         } else if(usernameExists) {
//             message = "Ja existe uma conta cadastrada com esse username";
//         } else {
//             usuarios.push(usuario)
//             validate = 1;
//         }
//         socket.emit('create_account_validation', validate, message)
//     });
// });

var login_io = io.of('/login');
login_io.on('connection', (socket) => {
    console.log(socket.id + ' login');
    message = '';
    validate = 0;

    socket.on('login_enter', (login_user,password) => {
        console.log('uepaa');
        const userExists = usuarios.some(user => (user.email === login_user  && user.password === password) || (user.username === login_user && user.password === password));
        if(userExists) {
            validate = 1;
            
        } else {
            console.log(' passou aq');
            message = "não existe uma conta com essas credenciais";
            validate = 0;
        }
        console.log('emitiu?');
        socket.emit('login_validation', validate, message);
        console.log('acho que sim');
    });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});