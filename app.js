/**
 * Created by colin on 10/27/2016.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var r = require('rethinkdb');
var fs = require("fs")
var stormpath = require('express-stormpath');


var port = 8000;
app.use("/public", express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/index.html');
});

app.get('/book', stormpath.loginRequired, function (req, res) {
    res.sendFile(__dirname + '/views/book.html');
});

app.get('/dashboard',stormpath.groupsRequired(['clinics']), function (req, res) {
    res.sendFile(__dirname + '/views/dashboard.html');
});

app.get('/patientview',stormpath.groupsRequired(['clinics']), function (req, res) {
    res.sendFile(__dirname + '/views/patientView.html');
});

app.get('/set',stormpath.groupsRequired(['clinics']), function (req, res) {
    res.sendFile(__dirname + '/views/set.html');
});

app.get('/dayview',stormpath.groupsRequired(['clinics']), function (req, res) {
    res.sendFile(__dirname + '/views/dayview.html');
});

http.listen(port);



app.use(stormpath.init(app, {
    web: {
        login:{
            enabled: true,
            nextUri: "/"
        }
    },
    postLoginHandler: function (account, req, res, next) {
        if(req.user.group == "clinics") {
            console.log("clinic");
        }
    }

}));


app.on('stormpath.ready', function () {
    console.log('Stormpath Ready!');
});

io.on("connection", function (socket) {
    var rconnection = null;
    console.log("You connected!");


    var caCert = fs.readFileSync(__dirname + '/cacert.txt').toString().trim();

    var dbConfig = {
        host: 'aws-us-east-1-portal.11.dblayer.com',
        port: 15568,
        user: 'colin',
        password: "9753186420TQRs",
        db: "WalkInExpress",
        ssl: {
            ca: caCert
        }
    };

        socket.on("getInitial", function () {
        r.connect({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            db: dbConfig.db,
            ssl: {
                ca: dbConfig.ssl.ca
            }
        }, function (err, conn) {
            if (err) throw err;
            rconnection = conn;
            r.table('appointments').eqJoin('patient', r.table('patients')).without({"right": {"id": true}}).zip().filter({viewed: false}).coerceTo('array').run(rconnection, function (err, cursor) {
                if (err) throw err;
                cursor.toArray(function (err, result) {
                    if (err) throw err;
                    console.log(result);
                    socket.emit("initRecords", result);
                });
            });

        });
    });


    socket.on("updateRecords", function () {
        r.connect({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            db: dbConfig.db,
            ssl: {
                ca: dbConfig.ssl.ca
            }
        }, function (err, conn) {
            if (err) throw err;
            rconnection = conn;
            r.db('WalkInExpress').table("appointments").changes().run(rconnection, function (err, cursor) {
                if (err) throw err;
                cursor.each(function (err, result) {
                    if (err) throw err;
                    console.log(result);
                    socket.emit("updateRecordsResults", result);
                });
            });
        });
    });

    socket.on("getNewAppointmentPatient", function (patientID) {
        r.connect({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            db: dbConfig.db,
            ssl: {
                ca: dbConfig.ssl.ca
            }
        }, function (err, conn) {
            if (err) throw err;
            rconnection = conn;
            r.table('patients').filter({id: patientID}).run(rconnection, function (err, cursor) {
                if (err) throw err;
                cursor.toArray(function (err, result) {
                    if (err) throw err;
                    console.log(result);
                    socket.emit("newAppointmentPatientData", result);

                });
            });
        });
    });

    socket.on("getInitialAppointments", function () {
        r.connect({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            db: dbConfig.db,
            ssl: {
                ca: dbConfig.ssl.ca
            }
        }, function (err, conn) {
            if (err) throw err;
            rconnection = conn;
            r.table('appointments').run(rconnection, function (err, cursor) {
                if (err) throw err;
                cursor.toArray(function (err, result) {
                    if (err) throw err;
                    console.log(result);
                    socket.emit("initRecordsAppointments", result);
                });
            });

        });
    });

    socket.on("deleteAppointment", function (appointmentID) {
        r.connect({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            db: dbConfig.db,
            ssl: {
                ca: dbConfig.ssl.ca
            }
        }, function (err, conn) {
            if (err) throw err;
            rconnection = conn;
            r.table('appointments').get(appointmentID).delete().run(rconnection, function (err, cursor) {
                if (err) throw err;
                console.log("DELETE APPOINTMENT DATA " + cursor);
            });
        });
    });

    socket.on("setViewed", function (appointmentID) {
        r.connect({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            db: dbConfig.db,
            ssl: {
                ca: dbConfig.ssl.ca
            }
        }, function (err, conn) {
            if (err) throw err;
            rconnection = conn;
            r.table('appointments').get(appointmentID).update({viewed: true}).run(rconnection, function (err, cursor) {
                if (err) throw err;
                console.log("UPDATE APPOINTMENT VIEWED " + cursor);
            });
        });
    });

    socket.on("newAppointmentSlot", function (appointmentTime) {
        r.connect({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            db: dbConfig.db,
            ssl: {
                ca: dbConfig.ssl.ca
            }
        }, function (err, conn) {
            if (err) throw err;
            rconnection = conn;
            var displayTime;

            if (appointmentTime == 12) {
                displayTime = appointmentTime + "PM";
            }
            else if (appointmentTime == 24) {
                displayTime = appointmentTime - 12 + "AM";
            }
            else if (appointmentTime > 13) {
                displayTime = appointmentTime - 12 + "PM";
            }

            else {
                displayTime = appointmentTime + "AM";
            }
            r.table('appointments').insert({
                "patient": null,
                "time": appointmentTime,
                "viewed": false,
                "displayTime": displayTime
            }).run(rconnection, function (err, cursor) {
                if (err) throw err;
                console.log("NEW APPOINTMENT MADE " + cursor);
            });
        });

    });

    socket.on("createPatient", function (data) {
        r.connect({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            db: dbConfig.db,
            ssl: {
                ca: dbConfig.ssl.ca
            }
        }, function (err, conn) {
            if (err) throw err;
            rconnection = conn;
            r.table('patients').insert({
                "DOB": data.DOB,
                "address": data.address,
                "doctor_id": data.doctor_id,
                "healthcard": data.healthcard,
                "name": data.name,
                "phone": data.phone
            }).run(rconnection, function (err, cursor) {
                if (err) throw err;
                console.log("NEW PATIENT MADE ");
                var id = cursor.generated_keys[0];
                socket.emit("newPatientID", id);
                console.log(id);

            });
        });

    });

    socket.on("assignAppointment", function (patientID, appointmentID) {
        r.connect({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            db: dbConfig.db,
            ssl: {
                ca: dbConfig.ssl.ca
            }
        }, function (err, conn) {
            if (err) throw err;
            rconnection = conn;
            r.table('appointments').get(appointmentID).update({patient: patientID}).run(rconnection, function (err, cursor) {
                if (err) throw err;
                console.log("UPDATE APPOINTMENT VIEWED " + cursor);
            });
        });

    });


});

console.log("App listening on port" + port);

