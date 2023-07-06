const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Lobby        = require('./classes/lobby.js')
const RoomManager  = require('./classes/room_manager.js');

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'public'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
  });

app.get('/login.html', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
  });


app.get('/register.html', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
  });

app.get('/menu.html', (req, res) => {
    res.sendFile(__dirname + '/public/menu.html');
  });

app.get('/public/:username/', (req, res) => {
    res.sendFile(__dirname + '/public/game.html');
    username = req.params.username;
    room_code = "public";
});

let room_codes = {}; 
app.get('/private/:room_code/:username', (req, res) => {
    res.sendFile(__dirname + '/public/game.html');
    username = req.params.username;
    room_code = req.params.room_code;
});
let usuarios = [];

var register_io = io.of('/register');
register_io.on('connection', (socket) => {
    console.log(socket.id + ' connected');
    message = '';
    validate = 0;

    socket.on('create_account', (email,username,password) => {
        let usuario = {
            email: email, password: password, username : username
        };  
        const emailExists = usuarios.some(user => user.email === email);
        const usernameExists = usuarios.some(user => user.email === email);
        if(emailExists) {
            message = "Ja existe uma conta cadastrada com esse email!";
        } else if(usernameExists) {
            message = "Ja existe uma conta cadastrada com esse username";
        } else {
            usuarios.push(usuario)
            validate = 1;
        }
        socket.emit('create_account_validation', validate, message)
    });
});

var login_io = io.of('/login');
login_io.on('connection', (socket) => {
    console.log(socket.id + ' login');
    message = '';
    validate = 0;
    username = '';

    socket.on('login_enter', (login_user,password) => {
        const userExists = usuarios.find(user => (user.email === login_user  && user.password === password) || (user.username === login_user && user.password === password));
        if(userExists) {
            validate = 1;
            username = userExists.username;            
        } else {
            message = "não existe uma conta com essas credenciais";
            validate = 0;
        }
        socket.emit('login_validation', validate, message, username);
        console.log("login_validation");
    });
    
});

var menu_io = io.of('/menu')
menu_io.on('connection', async(socket) => {
    console.log(socket.id + " joined menu");
    // Validação do usuário
    let validate = 0;
    let message = "";
    let login = new Promise((resolve, reject) => {

        socket.on('create_private', (username, room_code) => {
            if(room_codes[room_code] >= 1) {
                message = room_code + " already exists!";
                reject(message);
            } else {
                room_codes[room_code] = 1;
                validate = 1;
            }
            socket.emit('create_validation', validate, message)
        });
        // entrar na sala
        socket.on('join_private', (username, room_code) => {
            let validate = 0; 
            let message = "";
            if (room_codes[room_code] == null) {
                message = room_code + " does not exist!";
                reject(message);
            }
            else if (room_codes[room_code] == 1) {
                room_codes[room_code]++;
                validate = 1;
            } else if (room_codes[room_code] > 1) {
                message = "Room is full!";
                reject(message);
            }
            socket.emit('join_validation', validate, message);
        })
        resolve(message);
    });

    mode = await login;
});

var game_io = io.of('/game')
let lobby = new Lobby();
let room_manager = new RoomManager(game_io);
game_io.on('connection', (socket) => {
    console.log(socket.id + " entrou");
    lobby.add_player(socket.id, username, room_code);

    if(lobby.get_num_player() % 2 == 0 && lobby.get_num_player() > 0) {
        let player1 = lobby.public_queue.shift();
        let player2 = lobby.public_queue.shift();
        room_manager.create_room(player1, player2);
    }
    if(lobby.get_num_private_players(room_code) == 2) {
        let player1 = lobby.private_players[room_code].shift();
        let player2 = lobby.private_players[room_code].shift();
        room_manager.create_room(player1, player2);
    }

    socket.on('disconnect', () => {
        const room = room_manager.find_room(socket.id);
        if(room != null) {
            room.disconnect(socket.id);
        }
        if(room_codes[room_code] != null) {
            delete room_codes[room_code];
            delete lobby.private_players[room_code];
        }
        lobby.remove_player(socket.id);
    });

    socket.on('keydown', (keycode) => {
        if (room_manager.num_rooms > 0) {
            let user = room_manager.find_user(socket.id);
            if (user != null) {
                if(keycode != 32) {
                    room_manager.find_user(socket.id).keypress[keycode] = true;
                }
            }
        }
    });

    socket.on('keyup', (keycode) => {
        if (room_manager.num_rooms > 0) {
            let user = room_manager.find_user(socket.id);
            if (user != null) {
                room_manager.find_user(socket.id).keypress[keycode] = false;
            }
        }
    });

    socket.on('space_event', (space) => {
        if (room_manager.num_rooms > 0) {
            let user = room_manager.find_user(socket.id);
            const SPACE = 32;
            if (user != null) {
                if(space == 1) {
                    room_manager.find_user(socket.id).keypress[SPACE] = true;
                } else if(space == 0) {
                    room_manager.find_user(socket.id).keypress[SPACE] = false;
                }
            }
        }
    })
})

var update = setInterval(() => {
    room_manager.update();
}, 30);

http.listen(3000, () => {
  console.log('listening on *:3000');
});
