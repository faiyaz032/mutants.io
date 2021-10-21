/*
    Gamemaker: Studio 1.x/2 Socket.io extension 
    https://github.com/IgnasKavaliauskas/SocketIO-GMS2-Extension
*/

//http.listen(3000, '0.0.0.0', function(){
//  console.log('listening on *:3000');
//});

const server = require('http').createServer();
const io = require('socket.io')(server, {
   cors: { origin: '*' },
   pingTimeout: 1000,
   pingInterval: 2000,
});

const port = 3000;

// Listen for incoming connections
//server.listen(port, (err) => {
server.listen(port, '0.0.0.0', (err) => {
   if (err) throw err;
   console.log(`Listening on port ${port}`);
});

var players = []; // all connected players will be stored here
var clientId = 0; // unique ID for every client

var floaters = [];

class Updater {
   constructor(data) {
      this.id = data.id; //socket id
      this.x = data.x; //x
      this.y = data.y; //y
      this.h = data.h; //hsp
      this.v = data.v; //vsp
      this.H = data.H; //health
      this.k = data.k; //kills
      this.ga = data.ga; //gun angle
      this.gsi = data.gsi; // gun sprite index
      this.sh = data.sh; //shoot
      this.SId = data.SId; //serverid
      this.u = data.u; //username
      this.lbf = data.lbf; //last bullet fired by
   }
   toString() {
      return JSON.stringify(this, this.replacer);
   }

   replacer(key, value) {
      // we don't need to send the socket object to the client
      if (key == 'socket') return undefined;
      else return value;
   }
}

class Floater {
   constructor(data) {
      this.id = data.id;
      this.gsi = data.gsi;
      this.x = data.x;
      this.y = data.y;
      this.SId = data.SId;
   }
   toString() {
      return JSON.stringify(this, this.replacer);
   }

   replacer(key, value) {
      // we don't need to send the socket object to the client
      if (key == 'socket') return undefined;
      else return value;
   }
}

class Player {
   constructor(data) {
      this.username = data.username;
      this.socket = data.socket;
      this.id = data.id;

      this.x = data.x;
      this.y = data.y;
      this.hsp = data.hsp;
      this.vsp = data.vsp;
      this.gun_angle = data.gun_angle;
      this.gun_sprite_index = data.gun_sprite_index;
      this.shoot = data.shoot;
      this.health = data.health;
      this.lbf = data.lbf;

      this.sender = data.sender;
      this.message = data.message;

      this.SId = data.SId;

      this.kills = data.kills;
   }

   toString() {
      return JSON.stringify(this, this.replacer);
   }

   replacer(key, value) {
      // we don't need to send the socket object to the client
      if (key == 'socket') return undefined;
      else return value;
   }
}

function complimentaryPosUpdate() {
   // do whatever you like here
   for (let i in players) {
      var item = players[i];
      var room_id = item.SId;

      var player = item;
      var update = new Updater({
         id: player.id,
         //SId: player.SId,
         x: player.x,
         y: player.y,
         h: player.hsp,
         v: player.vsp,
         ga: player.gun_angle,
         gsi: player.gun_sprite_index,
         sh: player.shoot,
         H: player.health,
         lbf: player.lbf,
         k: player.kills,
      });

      io.to(room_id).emit('position_update', update.toString());
      console.log(update.toString());
   }

   setTimeout(complimentaryPosUpdate, 1000 / 10);
}

complimentaryPosUpdate();

io.on('connection', (client) => {
   var playerId = clientId++;
   var player;
   console.log('some random guy joined the server but didnt make a player yet');

   // This event will be trigered when the client request to join the game.
   // In this example project, it'll happen after you've entered your username on the client side
   client.on('create_player', (data) => {
      //when sio_emit_create_player called on client side
      data = JSON.parse(data);

      player = new Player({
         socket: client,
         id: playerId,

         SId: data.SId, //server id

         username: data.username,
         x: 250,
         y: 100, //some random point over the tall office tower
         hsp: 0,
         vsp: 0,
         gun_angle: 0,
         gun_sprite_index: 11,
         shoot: false,
         health: 100,
         lbf: 0,
         kills: JSON.stringify([]),
      });
      myRoom = data.SId;
      //add to room. later edit to take room input from user which decides game mode
      client.join(myRoom);
      //player.SId = myRoom;

      // Add to players list
      players.push(player);

      // Creating ourself, just ourself!
      client.emit('create_player', player.toString());
      console.log('created player' + player.toString());

      // Creating ourself for everyone else, ourself NOT included
      client.to(myRoom).emit('create_player_other', player.toString());

      // Creating everyone else for ourself(we as a new client who joined), ourself NOT included because we already created ourself
      for (let i in players) {
         if (players[i] !== player) {
            //add code here to only include players in your room
            if (players[i].SId == player.SId) {
               //checking for same room
               client.emit('create_player_other', players[i].toString());
            }
         }
      }

      // Creating every floater for this new guy
      for (let f in floaters) {
         var floater = floaters[f];
         if (floater.SId == player.SId) {
            //checking for same room
            client.emit('create_floater', floater.toString());
         }
      }

      console.log(`Player "${player.username}", with ID: ${player.id} created!`);
   });

   // Broadcast our position to all players, ourself included in client.emit
   // This is just an example project, we don't care if the client cheats. But you might consider also sending your own position to yourself for security/sync reasons
   // it depends on your project, e.g. if player position is important on client side
   client.on('position_update', (data) => {
      data = JSON.parse(data);

      player.x = data.x;
      player.y = data.y;
      player.hsp = data.hsp;
      player.vsp = data.vsp;
      player.gun_angle = data.gun_angle;
      player.gun_sprite_index = data.gun_sprite_index;
      player.shoot = data.shoot;

      var update = new Updater({
         id: player.id,
         //SId: player.SId,
         x: player.x,
         y: player.y,
         h: player.hsp,
         v: player.vsp,
         ga: player.gun_angle,
         gsi: player.gun_sprite_index,
         sh: player.shoot,
         H: player.health,
         lbf: player.lbf,
         k: player.kills,
      });

      client.to(player.SId).emit('position_update', update.toString());
      //trying to send to myself also
      client.emit('position_update', update.toString());
   });

   //chat
   client.on('chat', (data) => {
      data = JSON.parse(data);
      for (let i in players) {
         var item = players[i];
         if (item.id == data.sender) {
            var sender = players[i].username;
         }
      }
      var message = data.message;
      var chat = [sender, message];

      //this player JSON obj has many other keys like id also which is sent obviously
      client.to(player.SId).emit('chat', JSON.stringify(chat));
      //trying to send to myself also
      client.emit('chat', JSON.stringify(chat));
      console.log('message to send ' + chat.toString());
   });

   //heath updates given by a  when a hits b
   client.on('health_update', (data) => {
      data = JSON.parse(data);
      var killer = data.k_id;
      for (let i in players) {
         var item = players[i];
         //var f = ((players[i]).lbf==data.socket_id);
         if (item.id == data.socket_id) {
            players[i].health -= data.damage;
            players[i].lbf = killer;
            var h = players[i].health;
            const py = players[i];
            //send to all in room

            var update = new Updater({
               id: py.id,
               //SId: player.SId,
               x: py.x,
               y: py.y,
               h: py.hsp,
               v: py.vsp,
               ga: py.gun_angle,
               gsi: py.gun_sprite_index,
               sh: py.shoot,
               H: py.health,
               lbf: py.lbf,
               k: py.kills,
            });

            client.to(py.SId).emit('position_update', update.toString());
            client.emit('position_update', update.toString());
            //this above line is to send yourself the person you shot's health update

            if (h <= 0) {
               client.to(py.SId).emit('destroy_player', item.toString());
               client.emit('destroy_player', item.toString());
               players.splice(players.indexOf(item), 1);
               console.log('player was killed ' + item.toString());
               //now add this killed person to killers players JSon kills tag
               for (let j in players) {
                  if (players[j].id == killer) {
                     var kill_array_raw = players[j].kills;
                     var kill_array = JSON.parse(kill_array_raw);

                     if (!kill_array.includes(data.socket_id)) {
                        kill_array.push(data.socket_id);
                        players[j].kills = JSON.stringify(kill_array);
                     }
                  }
               }
               //code to make a new floating gun
               var floater;
               floater = new Floater({
                  id: item.id,
                  SId: py.SId, //server id
                  x: item.x,
                  y: item.y,
                  gsi: item.gun_sprite_index,
               });
               // Add to floaters list
               floaters.push(floater);

               // Creating this floater for everyone
               io.to(floater.SId).emit('create_floater', floater.toString());
               console.log('floaters are ' + floaters.toString() + 'and item is ' + item.toString());
            }
         }
      }
      if (typeof h !== 'undefined') {
         console.log('player health is ' + h.toString());
      }

      //this player JSON obj has many other keys like id also which is sent obviously
      // client.broadcast.emit('position_update', player.toString());
   });

   // When a player closes the game or refresh the page, this event will be triggered
   client.on('disconnect', () => {
      if (typeof player != 'undefined') {
         client.to(player.SId).emit('destroy_player', player.toString());
      }

      if (players.indexOf(player) != -1) {
         players.splice(players.indexOf(player), 1);
      }

      //the following code is mostly crap
      /*
        // Tell everyone that we disconnected (ourself NOT included, because we already closed the game and we don't care)
        for (let i in players) {
            var item = players[i];
            if (typeof data != 'undefined') {
                if (item.id == data.socket_id) {

                    var health = item.health;
                    if (health <= 0) //player was dead before disconnecting
                    {
                        //code if player disconnected after dying
                        //Remove player from list
                        players.splice(players.indexOf(item), 1);

                    } else {
                        //code if player disconnected while being alive
                        // client.broadcast.emit('destroy_player', item.toString());
                        //Remove player from list
                        // players.splice(players.indexOf(item), 1);
                        players[i].health = -1;
                    }
                }
            } else {
                //
                // client.broadcast.emit('destroy_player', item.toString());
                //Remove player from list
                // players.splice(players.indexOf(item), 1);
            }
        }
        */

      console.log(`Player "${player.username}", with ID: ${player.id} disconnected.`);
   });
});
