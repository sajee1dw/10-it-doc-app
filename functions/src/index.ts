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

const db = admin.firestore();



//** response area,suberb,doctors function: [1]

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
        doctors.docs.forEach((doc:any)=>{
          var tempDoc:any = {};
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



//to get doctors infors[name,phone,address,appint,booking caiendars] function: [2]

export const GetDoctorsInfo = functions.https.onRequest(
  async (request, response) => {
    admin.firestore().collection;

    let docsInfo: any = {};
    try {
      let doctors = await db.collection("doctors").get();
      if (doctors) {
        docsInfo["doctors"] = [];
        doctors.docs.forEach((doc:any) =>{
          var tempDoc:any = {};
          tempDoc.name = doc.data().name;// || "N/A"
          tempDoc.phone = doc.data().phone;// ||"N/A"
          tempDoc.address = doc.data().address;// ||"N/A"
          tempDoc.appointmentcalendar = doc.data().appointmentcalendar;// ||"N/A"
          tempDoc.bookingcalendar = doc.data().bookingcalendar;// ||"N/A"
          docsInfo["doctors"].push(tempDoc);
        })
      }
    } catch (e) {
      console.error(e);
    }
    console.log("Final result");
    console.log(docsInfo);
    response.json(docsInfo );
  }
);






const oAuth2Client = new OAuth2(
  googleCredentials.web.client_id,
  googleCredentials.web.client_secret,
  googleCredentials.web.redirect_uris[0]
);

oAuth2Client.setCredentials({
  refresh_token: googleCredentials.refresh_token,
});

export const addEventToCalendar = functions.https.onRequest(
  (request, response) => {
    const eventData = {
      eventName:  "hello", //request.body.eventName,"Doc book"
      description: "book appointment",// request.body.description,"book appointment"
      startTime:"2020-05-28T07:00:00",// request.body.startTime,"2020-04-20T08:00:00"
      endTime: "2020-05-28T09:30:00",// request.body.endTime,"2020-04-20T08:30:00"
    };

    addEvent(eventData, oAuth2Client)
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
  }
);

export const listCalendarEvents = functions.https.onRequest(
  (request, response) => {
    listEvents(oAuth2Client);

    response.status(200).send("Ok");
  }
);

const ERROR_RESPONSE = {
  status: "500",
  message: "There was an error adding an event to your Google calendar",
};
const TIME_ZONE = "Time zone in Katubedda, Moratuwa (GMT+5:30)";//EST  +5:30

function listEvents(auth: any) {
  const calendar2 = google.calendar({ version: "v3", auth });
  calendar2.events.list(
    {
      calendarId: 'primary', //"primary"
      timeMin:(new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    },
    (err: any, res: any) => {
      if (err) return console.log("The API returned an error: " + err);
      const events = res.data.items;
      if (events) {
        console.log("Upcoming 10 events:");
        events.forEach((event: any) => {
          const start = event.start.dateTime || event.start.date;
          const end = event.end.dateTime || event.end.date;
          const day =  event.start.date ;
          // var Date = events.getDate(data);
          console.log(`${day} "start:" ${start} ,"end:" ${end}`);
        });
      } else {
        console.log("No upcoming events found.");
      }
    }
  );
}



export const listCalendars = functions.https.onRequest((request, response) => {
  const calendar3 = google.calendar({ version: "v3", oAuth2Client });

  calendar3.calendarList.list(oAuth2Client, function (err: any, resp: any) {
    if (err) {
      console.log(err);
      response.status(200).send(err);
    } else {
      resp.data.items.forEach(function (cal: any) {
        console.log(cal.summary + " - " + cal.id);
      });
      response.status(200).send("Ok");
    }
  });
});



function addEvent(event: any, auth: any) {
  return new Promise(function (resolve, reject) {
    calendar.events.insert(
      {
        auth: auth,
        calendarId: "primary",
        resource: {
          // date : event.eventDate,
          summary: event.eventName,
          description: event.description,
          start: {
            date: event.date,
            dateTime: event.startTime,
            timeZone: TIME_ZONE,//TIME_ZONE
          },
          end: {
            date: event.date,
            dateTime: event.endTime,
            timeZone: TIME_ZONE,
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



//to get doctors infors[name,phone,address,appint,booking caiendars] function: [2]

// export const GetDoctorsInfo = functions.https.onRequest(
//   async (request, response) => {
//     admin.firestore().collection;

//     let docsInfo: any = {};
//     try {
//       let doctors = await db.collection("doctors").get();
//       if (doctors) {
//         docsInfo["doctors"] = [];
//         doctors.docs.forEach((doc:any) =>{
//           var tempDoc:any = {};
//           tempDoc.name = doc.data().name;// || "N/A"
//           tempDoc.phone = doc.data().phone;// ||"N/A"
//           tempDoc.address = doc.data().address;// ||"N/A"
//           tempDoc.appointmentcalendar = doc.data().appointmentcalendar;// ||"N/A"
//           tempDoc.bookingcalendar = doc.data().bookingcalendar;// ||"N/A"
//           docsInfo["doctors"].push(tempDoc);
//         })
//       }
//     } catch (e) {
//       console.error(e);
//     }
//     console.log("Final result");
//     console.log(docsInfo);
//     response.json(docsInfo );
//   }
// );

