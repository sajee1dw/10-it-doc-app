import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// import { firebaseConfig, config } from "firebase-functions";
// import {firebaseConfig, config} from "firebase-functions";
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const calendar = google.calendar("v3");

const googleCredentials = require("../keys/credentials.json");

admin.initializeApp({
  credential: admin.credential.cert(require("../keys/admin.json")),
  databaseURL: "https://book-my-doctor-eadd7.firebaseio.com",
});
const moment = require('moment');
const db = admin.firestore();



//**----------------------------- response area,suberb,doctors function: [1] ----start

export const GetDoctorsAreaList = functions.https.onRequest(
  async (request, response) => {
    admin.firestore().collection;
    let docInfo: any = {};
    try {
      let areas = await db.collection("areas").get();
      if (areas) {
        docInfo["areas"] = areas.docs.map((doc) => doc.data());
      }

      let suburbs = await db.collection("suburbs").get();
      if (suburbs) {
        docInfo["suburbs"] = suburbs.docs.map((doc) => doc.data());
      }

      let doctors = await db.collection("doctors").get();
      if (doctors) {
        docInfo["doctors"] = [];
        doctors.docs.forEach((doc: any) => {
          var tempDoc: any = {};
          tempDoc.name = doc.data().name;// || "N/A"
          tempDoc.area = doc.data().area;// ||"N/A"
          tempDoc.suburb = doc.data().suburb;// ||"N/A"
          docInfo["doctors"].push(tempDoc);
        })
      }
    } catch (e) {
      console.error(e);
    }
    console.log("Final result");
    console.log(docInfo);
    response.json(docInfo);

  }
);

//// <------------------------------------------------------------end----------------------------------------------------------------------->



//**----------------------to get doctors infors[name,phone,address,appint,booking caiendars] function: [2] ---start
export const GetInfo = functions.https.onRequest(
  async (req: any, res: any) => {
    let doctorsRef = db.collection('doctors');
    let query = doctorsRef.where('name', '==', 'p.k silva').get()
      .then(snapshot => {
        if (snapshot.empty) {
          console.log('No matching documents.');
          return;
        }

        snapshot.forEach((doc: any) => {
          //console.log(doc.id, '=>', doc.data());
          var tempDocc: any = {};
          // var Info = [];
          tempDocc.name = doc.data().name;// || "N/A"
          tempDocc.phone = doc.data().phone;// ||"N/A"
          tempDocc.address = doc.data().address;// ||"N/A"
          tempDocc.appointmentcalendar = doc.data().appointmentcalendar;// ||"N/A"
          tempDocc.bookingcalendar = doc.data().bookingcalendar;// ||"N/A"
           // Info.push(tempDoc);
          res.json(tempDocc);
          console.log(tempDocc);

        });
      })
      .catch(err => {
        console.log('Error getting documents', err);
      });
    return query;
  });

//// <---------------------------------------------------------end----------------------------------------------------------------------->

const oAuth2Client = new OAuth2(
  googleCredentials.web.client_id,
  googleCredentials.web.client_secret,
  googleCredentials.web.redirect_uris[0]
);


//// calendar tocken refresh
oAuth2Client.setCredentials({
  refresh_token: googleCredentials.refresh_token,
});

const ERROR_RESPONSE = {
  status: "500",
  message: "There was an error adding an event to your Google calendar",
};


const TIME_ZONE = "Time zone in Katubedda, Moratuwa (GMT+5:30)";//EST  +5:30





//**------------------------- response doctors booking time slots['date','starttime','endtime']  function [3] ----start
export const GetDoctorBookingCalendar = functions.https.onRequest(
  (request, response) => {
    listEvents(oAuth2Client);
    {
      response.status(200).send("Ok");

    }
  });

function listEvents(auth: any) {
  const calendar2 = google.calendar({ version: "v3", auth });
  const moment = require('moment');
  calendar2.events.list(
    {
      calendarId: 'primary', //"primary"
      timeMin: (moment().subtract(1, 'days')).toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    },
    (err: any, res: any) => {
      if (err) return console.log("The API returned an error: " + err);
      const events = res.data.items;
      if (events) {
        console.log("Upcoming 100 events:");
        events.forEach((event: any) => {
          var tempEvent: any = {}
          var evv = [];
          tempEvent.Date = moment(event.start.dateTime).format('YYYY-MM-DD');
          tempEvent.sTime = moment(event.start.dateTime).format('hh-mm');
          tempEvent.eTime = moment(event.end.dateTime).format('hh-mm');
          evv.push(tempEvent);

          for (let i = 0; i < evv.length; i++) {
            var x = moment().format('YYYY-MM-DD');
            var y = moment().format('hh-mm');
            var z = moment().format('hh-mm');
            if (evv[i].Date == x && evv[i].sTime != y && evv[i].eTime != z) {
              console.log(evv[i]);

            }
          }

        });
      } else {
        console.log("No upcoming events found.");
      }

    });
}

////< ---------------------------------------------------- end------------------------------------------------------------------------>



//**-----------------------------response booked time slots ['date','starttime','endtime'] function [4] ---start
export const GetDoctorAppointments = functions.https.onRequest(
  (req, res) => {
    listBookingEvents(oAuth2Client)
    
  });

async function listBookingEvents(auth: any) {
  const calendar2 = google.calendar({ version: "v3", auth });
  const moment = require('moment');
  calendar2.events.list(
    {
      calendarId: 'mt6pgiacc0bqjqg5s86seh9qs4@group.calendar.google.com', //"primary"
      timeMin: (moment().subtract(1, 'days')).toISOString(),//timeMin gives tommorow events [new Date()]
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    },
    (err: any, res: any) => {
      if (err) return console.log("The API returned an error: " + err);
      const events = res.data.items;
      if (events) {
        console.log("Upcoming 100 events:");
        events.forEach((event: any, res: any) => {
          var tempEvent: any = {}
          var evv = [];
          tempEvent.Date = moment(event.start.dateTime).format('YYYY-MM-DD');
          tempEvent.sTime = moment(event.start.dateTime).format('hh-mm');
          tempEvent.eTime = moment(event.end.dateTime).format('hh-mm');
          evv.push(tempEvent);

          for (let i = 0; i < evv.length; i++) {
            var x = moment().format('YYYY-MM-DD');
            var y = moment().format('hh-mm');
            var z = moment().format('hh-mm');
            if (evv[i].Date == x && evv[i].sTime != y && evv[i].eTime != z) {
              const jsonStr = JSON.stringify(evv[i]);
                console.log(jsonStr);
                
            }
          }
        });
      } else {
        console.log("No upcoming events found.");
      }
    });
}

////<----------------------------------------------------------------end------------------------------------------------------------------->


//**------------------------response/request patient data function [5]
export const BookDoctor = functions.https.onRequest(
  async (request, response) => {
    const eventData = {
      eventName: request.body.eventName,
      startTime: request.body.startTime,//"2020-04-20T08:00:00"
      endTime: request.body.endTime,//"2020-04-20T08:30:00"
      name: request.body.name,
      patient: request.body.patient,
      idno: request.body.idno,
      age: request.body.age,
      address: request.body.address,
      phone: request.body.phone,
      mobile: request.body.mobile,
      symptom: request.body.symptom,
    };

    addEventBooking(eventData, oAuth2Client)
      .then((data) => {
        response.status(200).send(data);
        console.log('ok');
        return;
      })
      .catch((err) => {
        console.error("Error adding event: " + err.message);
        response.status(500).send(ERROR_RESPONSE);
        return;
      });
      //response.json(eventData);
      var hip: any = {}
     // var p = [];
      // hip.p = request.params.true;;
       hip.d = moment(eventData.startTime).format('YYYY-MM-DD');
       hip.s = moment(eventData.startTime).format('hh-mm');
       hip.e = moment(eventData.endTime).format('hh-mm');
        
      response.json(hip);
    } 
);



function addEventBooking(event: any, auth: any) {
  return new Promise(function (resolve, reject) {
    calendar.events.insert(
      {
        auth: auth,
        calendarId: "mt6pgiacc0bqjqg5s86seh9qs4@group.calendar.google.com",
        resource: {
          summary: event.eventName,
          start: {
            date: event.date,
            dateTime: event.startTime,
            timeZone: TIME_ZONE,
          },
          end: {
            date: event.date,
            dateTime: event.endTime,
            timeZone: TIME_ZONE,
          },
          extendedProperties: {

            shared: {
              name: event.name,
              patient: event.patient,
              idno: event.idno,
              age: event.age,
              address: event.address,
              phone: event.phone,
              mobile: event.mobile,
              symptom: event.symptom,
            }
          },
        },
      },
      (err: any, res: any) => {
        if (err) {
          console.log("Rejecting because of error");
          reject(err);
        }
        console.log("Request successful");
        resolve(res.data);
      }
    );
  });
}


const express = require('express')
const index = express()
const bodyparser = require('body-parser');
index.use(bodyparser.json());
export const Book = functions.https.onRequest(
  async (request, response) => {
    
    const ideaId=request.params.iId;
    console.log(ideaId);
    response.json(ideaId)
  });

