var tmi = require('tmi.js');

const BeamClientNode = require('beam-client-node');
const BeamSocketNode = require('beam-client-node/lib/ws');

var beamUserName = 'Fric';
var twitchUserName = 'fricules';

var options = {
	options: {
		debug: true
	},
	connection: {
		cluster: "aws",
		reconnect: true
	},
	identity: {
		username: twitchUserName,
		password: "oauth:fihdqlb3eismsjaqbfqz7j6y78zjx8"
	},
	channels: ["kulwych"]
};

let userInfo;

var twitchClient = new tmi.client(options);
twitchClient.connect();

var beamClient = new BeamClientNode();

beamClient.use('password', {
	username: beamUserName,
	password: 'password'
})
.attempt()
.then(response => {
	userInfo = response.body;
	return beamClient.chat.join(response.body.channel.id);
})
.then(response => {
	const beamSocket = new BeamSocketNode(response.body.endpoints).boot();
	
	// Copy chat to twitch
	beamSocket.on('ChatMessage', data => {
		if (beamUserName.toLowerCase() != data.user_name.toLowerCase()) {
			twitchClient.say("kulwych", '[Beam - ' + data.user_name + ']: ' + data.message.message[0].data);
		}
	});
	
	// Copy chat to beam
	twitchClient.on('chat', function(channel, user, message, self) {
		if ( options.identity.username != user['display-name'] ) {
			beamSocket.call('msg', ['[Twitch - ' + user['display-name'] + ']: ' + message]);
		}
	});
	
	// Handle errors
    beamSocket.on('error', error => {
        console.error('Socket error', error);
    });
	
	return beamSocket.auth(userInfo.channel.id, userInfo.id, response.body.authkey)
    .then(() => {
        console.log('Beam Login successful');
        return beamSocket.call('msg', ['Hello World!']);
    });
	
})
.catch(error => {
    console.log('Something went wrong:', error);
});

twitchClient.on('connected', function(address, port) {
	console.log("Address: " + address + " on Port: " + port);
	twitchClient.action("kulwych", "Hello world!")
	beamClient
});