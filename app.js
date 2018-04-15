/**
 * Created by nicolas baillod on 07.04.2018.
 */

var express = require('express');
var app = express();
var path = require('path');
var jquery = require('jquery');
var bodyParser = require('body-parser');
var jsonfile = require('jsonfile');
var fs = require('fs');
var NodeRSA = require('node-rsa');

//define an absolute path in order to get html and css files
app.use(express.static('public'));


app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//set the view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


//user currently logged on the client, usefull to get the username when he sends an email and to get the private key
var currentUser;

//get the signup page
app.get('/signup', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/HTML/SignUp.html'));
});

//post and checking the informations send on the signup form
app.post('/gettingdata', function (req, res) {

	var key = new NodeRSA({b: 512});
    var username = req.body.username;
    var password = req.body.password;
    var publickey = key.exportKey('public') // create new public key
    var privatekey = key.exportKey('private') // create new private key
    

    //object will be store in a Json file. There's ine file per user.
    var user = {
        username: username,
        password: password,
        Publickey: publickey,
        Privatekey: privatekey
    };

    //object will be stored in a Json file. Usefull to diplay all the adresses.
    var carnet = {
        username: username,
        publickey: publickey
    }

    saveUser(user, function (err) {
        if(err) {
            return;
        }
    });

   function saveUser(user) {
        //check if the user already exists
        if(fs.existsSync('./Database/users/' + username + '.json')) {
            res.send('User not saved, already exists') ;  
            return
        } 

        /*if the user does not exists, write in the carnetAdress and indivudual files. First of all, write in the
         carnet file. If the file already exists, happen the new datas. If it does not exists, create the file. We have
         to do so, because the writefile's method erase all the datas before writing new ones*/
        if(!fs.existsSync('./Database/users/carnetAdress.json')) {
            fs.writeFileSync('./Database/users/carnetAdress.json', '{"users": [' + JSON.stringify(carnet) + ']}');
        } else {
            if (! fs.existsSync('./Database/users/' + username + '.json')) {
                fs.readFile('./Database/users/carnetAdress.json', 'utf8', function readFileCallback(err, data) {
                    if(err) {
                        console.log(err);
                    } else {
                        var obj = JSON.parse(data); //now it an object
                        obj.users.push(carnet); //add some data
                        var json = JSON.stringify(obj); //convert it back to json
                        fs.writeFileSync('./Database/users/carnetAdress.json', json, 'utf8'); // write it back
                    }
                });
            }
        }
        //write in the individual file
        fs.writeFileSync('./DataBase/users/' + username + '.json', JSON.stringify(user));
        //modify the permission in a order to allow only read mode
        fs.chmod('./DataBase/users/' + username + '.json', 4444, function (err) {
            if(err)
                console.log(err);
        });
        res.send('User saved');
    }
});

//get the login page
app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/HTML/Login.html'));
});

//post the datas from the login form
app.post('/postlogin', function (req, res) {

    //first of all, check if the user exists. If not, redirect to the signup page
    fs.open('./DataBase/users/' + req.body.username + '.json', 'r', (err) => {
        if(err) {
            if(err.code === 'ENOENT') {
                res.send(req.body.username + 'does not exists, please sign up')
                return;
            }
            throw err;
        }
        //read the user's file name and checking the password
        fs.readFile('./DataBase/users/' + req.body.username + '.json', 'utf8', function (err, data) {
            if(err)
                console.error(err)
            currentUser = JSON.parse(data);
            if(currentUser.password === req.body.password) {
                res.sendFile(path.join(__dirname+'/public/HTML/Courriel.html'));
                decrypt(currentUser.username);
            } else {
                res.redirect('/login'); // wrong password, loop on the login page
            }
        })
    });
});

//logout
app.post('/postlogout', function (req, res, next) {

   res.sendFile(path.join(__dirname+'/public/HTML/Login.html'));
   currentUser.username = null;
   currentUser.password = null;
   currentUser.Publickey = null;
   currentUser.Privatekey = null;
});


app.get('/', function (req, res) {

    res.sendFile(path.join(__dirname+'/public/HTML/Login.html'));
});

/*app.get('/EmailListe', function (req, res) {

    res.sendFile(path.join(__dirname + '/public/HTML/EmailListe.html'));

});*/

app.get('/ComposeEmail', function (req, res) {

    res.sendFile(path.join(__dirname + '/public/HTML/ComposeEmail.html'));

});
//post datas from the new email form
app.post('/send', function (req, res) {

    //store the field's data
    var message = req.body.message;
    var destinataire = req.body.destinataire;
    var objet = req.body.objet;

    //create a new empty RSA key
    var key = new NodeRSA();

    //check if the recipiant exists in the database
    fs.open('./DataBase/users/' + destinataire + '.json', 'r', (err) => {
        if(err) {
            if(err.code === 'ENOENT') {
                res.send(destinataire + ' does not exists');
                return;
            }
        }
    });

    //get the public recipiant's public key
    var dest = fs.readFileSync('./DataBase/users/' + destinataire + '.json', 'utf8');
    var parsDest = JSON.parse(dest);
    var keyData = parsDest.Publickey;
    key.importKey(keyData, 'public');

    //encrypt message
    var encrypted = key.encrypt(message, 'base64', 'utf8');

    //object will be stored in a Json file
    var email = {
        from: currentUser.Publickey,
        to: parsDest.Publickey,
        objet: objet,
        message: encrypted
    };

    /*if the user does not exists, write in the indivudual email file. If it does not exists, create the file. We have
     to do so, because the writefile's method erase all the datas before writing new ones*/
    if(!fs.existsSync('./Database/emails/' + destinataire + '.json')) {
        fs.writeFileSync('./Database/emails/' + destinataire + '.json', '{"message": [' + JSON.stringify(email) + ']}');
    } else {
        fs.readFile('./Database/emails/' + destinataire + '.json', 'utf8', function readFileCallback(err, data) {
            if(err) {
                console.log(err);
            } else {
                var obj = JSON.parse(data); //now it an object
                obj.message.push(email); //add some data
                var json = JSON.stringify(obj); //convert it back to json
                fs.writeFileSync('./Database/emails/' + destinataire + '.json', json, 'utf8'); // write it back
            }
        });
    }
    res.send('message envoyé !')

});

//function pour decrypter le fichier contenant les mails
function decrypt(username) {
    var mail;
    if(fs.existsSync('./Database/emails/' + username + '.json')) { //si l'utilisateur a des mails
        fs.readFile('./DataBase/emails/' + username + '.json', 'utf8', function (err, data) {
        if(err) {
            console.error(err);
        }
            if(fs.existsSync('./Database/emails/' + username + 'D.json')) { //Si le fichier existe on le supprime 
            fs.unlink('./Database/emails/' + username + 'D.json', (err) => {
                  if (err) throw err;  
                }); 
            }
     
        mail = JSON.parse(data);//add some data
               
              
        //create a new empty RSA key
         var key = new NodeRSA();
              
        //get the user's private key
        var user = fs.readFileSync('./DataBase/users/' + currentUser.username + '.json', 'utf8');
        var parsUser = JSON.parse(user);
        var keyData = parsUser.Privatekey;
        key.importKey(keyData, 'private');
        console.log("on rentre dans la boucle",mail.message.length );
            var c=0;
        //dechiffrement de chaque mail contenu dans le dossier de l'utilisateur   
        for(i=0;i<mail.message.length;i++) {
        
            //decrypt message
            var decrypted = key.decrypt(mail.message[i].message, 'utf8', 'base64');

            //object will be stored in a Json file
            var email = {
                from: mail.message[i].from,
                to: mail.message[i].to,
                objet: mail.message[i].objet,
                message: decrypted
            };
            
                        
              console.log(i,' et ', decrypted);          
                        
            /*Si le dossier n'existe pas, on le crée et on y ajoute le mail déchiffré, sinon on lit le dossier afin de le vider 
            ou d'y ajouter un mail supplémentaire*/
            if(fs.existsSync('./Database/emails/' + username + 'D.json')) {
                
                
                 fs.readFile('./Database/emails/' + username + 'D.json', 'utf8', function readFileCallback(err, data) {
                    if(err) {
                        console.log(err);
                    } else {
                var obj = JSON.parse(data); //now it an object
                        console.log(i,'et ',obj);
                obj.message.push(email); //add some data
                var json = JSON.stringify(obj); //convert it back to json
                fs.writeFileSync('./Database/emails/' + username + 'D.json', json, 'utf8'); // write it back
            }
                    });  
            } else {
                  fs.writeFileSync('./Database/emails/' + username + 'D.json', '{"message": [' + JSON.stringify(email) + ']}');
                
                /*
                console.log(i);
                if (i>0) { //On ajoute un mail qui n'est pas le premier dans le dossier
                    console.log("i= ",i);
                    fs.readFile('./Database/emails/' + username + 'D.json', 'utf8', function readFileCallback(err, data) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("Boucle add un mail ",i);
                        var obj = JSON.parse(data); //now it an object 
                       
                        obj.message.push(email); //add some data
                        var json = JSON.stringify(obj); //convert it back to json
                        fs.writeFileSync('./Database/emails/' + username + 'D.json', json, 'utf8'); // write it back
                        }
                    });  
                } else { //le dossier existe mais on le vide afin d'y écrire le premier message
                    fs.readFile('./Database/emails/' + username + 'D.json', 'utf8', function readFileCallback(err, data) {
                        if(err) {
                            console.log(err);
                        } else {
                            console.log("Boucle vide + 1 mail ",i);
                            var obj = JSON.parse(data); //now it an object
                            
                            obj.message=null;
                            var json = JSON.stringify(email); //convert it back to json
                            fs.writeFileSync('./Database/emails/' + currentUser.username + 'D.json', '{"message": [' + json + ']}', 'utf8'); // write it back
                            }
                        });
                    }*/
                }
            }
        });   
    }
}

//get the page carnet adresses
app.get('/CarnetAdresse', function (req, res) {

    var info;
    jsonfile.readFile('./Database/users/carnetAdress.json', function (err, obj) {
        info = obj;
        res.render('userlist', {user: info});
    });
});

//get the page messages reçu
app.get('/EmailListe', function (req, res) {
    //decrypt(currentUser.username);
    var info;
    jsonfile.readFile('./Database/emails/'+ currentUser.username +'D.json', function (err, obj) {
        info = obj;
        res.render('usermail', {user: info});
    });
});

app.listen(3000);
console.log("server up and running");
