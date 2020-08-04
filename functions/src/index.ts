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
const moment = require("moment");
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
          tempDoc.name = doc.data().name; // || "N/A"
          tempDoc.area = doc.data().area; // ||"N/A"
          tempDoc.suburb = doc.data().suburb; // ||"N/A"
          docInfo["doctors"].push(tempDoc);
        });
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
  async (request: any, res: any) => {
    let doctorsRef = db.collection("doctors");
    const infoData = {
      docArea: request.body.docArea,
      docSuburb: request.body.docSuburb,
      docName: request.body.docName,
    };
    console.log(infoData);
    let query = doctorsRef
      .where("name", "==", infoData.docName)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          console.log("No matching documents.");
          return;
        }
        snapshot.forEach((doc: any) => {
          var tempDocc: any = {};
          tempDocc.name = doc.data().name;
          tempDocc.phone = doc.data().phone;
          tempDocc.address = doc.data().address;
          tempDocc.appointmentcalendar = doc.data().appointmentcalendar;
          tempDocc.bookingcalendar = doc.data().bookingcalendar; // ||"N/A"
          res.json(tempDocc);
          console.log(tempDocc);
        });
      })
      .catch((err) => {
        console.log("Error getting documents", err);
      });
    return query;
  }
);

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

const TIME_ZONE = "Time zone in Katubedda, Moratuwa (GMT+5:30)"; //EST  +5:30

//**------------------------- response doctors booking time slots['date','starttime','endtime']  function [3] ----start
var reqDate: any;
export const GetDoctorBookingCalendar = functions.https.onRequest(
  async (request, response) => {
    reqDate = {
      date: request.body.date, //"2020-07-31 00:00:00.000"//request.body.date
    };
console.log(reqDate.date)
    var items: any = await listEvents(oAuth2Client);
    var newItem: any = await listBookingEvents(oAuth2Client);
    var timeSlot: any = [];
    items.forEach(function (item: any) {
      var removed = item.splice(-1, 1);
      console.log(removed);
      item.forEach(function (i: any) {
        newItem.forEach(function (value: any) {
          if (value.startTime == i.startTime && value.Date == i.date) {
            i.slot = value.slot;
          }
        });
      });
      timeSlot.push(item);
    });
    console.log(timeSlot);
    response.json(timeSlot);
  }
);

function listEvents(auth: any) {
  return new Promise((resolve, reject) => {
    const calendar2 = google.calendar({ version: "v3", auth });
    const moment = require("moment");
    var firstTime = moment(reqDate.date, "YYYY-MM-DD h:m").toISOString();
    var lastTime = moment(reqDate.date, "YYYY-MM-DD h:m")
      .endOf("day")
      .toISOString();
    var min = moment().startOf("day").toISOString();
    var max = moment().endOf("day").toISOString();

    calendar2.events.list(
      {
        calendarId: "primary", //"primary"
        timeMin: !reqDate.date ? min : firstTime, //moment().startOf('day').toISOString(), //moment().subtract(1, "days").toISOString(),
        timeMax: !reqDate.date ? max : lastTime, //moment().endOf('day').toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: "startTime",
      },
      (err: any, res: any) => {
        if (err) return console.log("The API returned an error: " + err);
        const events = res.data.items;
        if (events) {
          console.log("Upcoming 100 events:");
          const Moment = require("moment");
          const MomentRange = require("moment-range");
          const moment = MomentRange.extendMoment(Moment);
          var evv: any = [];
          var arrNoBook: any = [];
          events.forEach((event: any) => {
            if (event.status == "confirmed") {
              var tempEvent: any = {};
              tempEvent.Date = moment(event.start.dateTime).format(
                "YYYY-MM-DD"
              );
              tempEvent.sTime = moment(event.start.dateTime).format(
                "YYYY-MM-DDTHH:mm"
              );
              tempEvent.eTime = moment(event.end.dateTime).format(
                "YYYY-MM-DDTHH:mm"
              );
              evv.push(tempEvent);
            }
          });
          var arr: any = [];

          evv.forEach(function (value: any) {
            var memo: any = {};
            memo.date = value.Date;
            memo.start = moment(value.sTime);
            memo.end = moment(value.eTime);
            arr.push(memo);
          });
          for (let i of arr) {
            const range = moment.range(i.start, i.end);
            const rangeBy = range.by("minutes", { step: 15 });
            var res: any = {};
            res = Array.from(rangeBy).map((m: any) => ({
              date: i.date,
              startTime: moment(m.toString()).format("HH:mm"),
              endTime: moment(m.add(15, "m").toString()).format("HH:mm"),
              slot: 0,
            }));
            if (true) {
              res[res.length - 1].endTime = moment(i.end.toISOString()).format(
                "HH:mm"
              );
            }
            arrNoBook.push(res);
          }
          resolve(arrNoBook);
        } else {
          console.log("No upcoming events found.");
        }
      }
    );
  });
}

////< ---------------------------------------------------- end------------------------------------------------------------------------>

//**-----------------------------response booked time slots ['date','starttime','endtime'] function [4] ---start
export const GetDoctorAppointments = functions.https.onRequest(
  async (req, res) => {
    let temp = await listBookingEvents(oAuth2Client);
    res.json(temp);
    //console.log(temp);
  }
);

function listBookingEvents(auth: any) {
  return new Promise((resolve: any, reject) => {
    const calendar2 = google.calendar({ version: "v3", auth });
    const moment = require("moment");
    calendar2.events.list(
      {
        calendarId: "mt6pgiacc0bqjqg5s86seh9qs4@group.calendar.google.com",
        timeMin: moment().subtract(1, "days").endOf("day").toISOString(),
        timeMax: moment().add(1, "days").endOf("day").toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: "startTime",
      },
      (err: any, res: any) => {
        if (err) return console.log("The API returned an error: " + err);
        const events = res.data.items;
        if (events) {
          console.log("Upcoming 100 events:");
          let bookedEventList: any = [];
          events.forEach((event: any, res: any) => {
            var tempEvent: any = {};

            if (event.status == "confirmed") {
              tempEvent.Date = moment(event.start.dateTime).format(
                "YYYY-MM-DD"
              );
              tempEvent.startTime = moment(event.start.dateTime).format(
                "HH:mm"
              );
              tempEvent.endTime = moment(event.end.dateTime).format("HH:mm");
              tempEvent.slot = 1;
              bookedEventList.push(tempEvent);
            } //console.log(event.start.dateTime);
          });

          // console.log(bookedEventList);
          resolve(bookedEventList);
        } else {
          resolve("No upcoming events found.");
        }
      }
    );
  });
}

////<----------------------------------------------------------------end------------------------------------------------------------------->

//**------------------------response/request patient data function [5] ---- start
export const BookDoctor = functions.https.onRequest(
  async (request, response) => {
    const eventData = {
      eventName: request.body.eventName,
      startTime: request.body.startTime, //"2020-04-20T08:00:00"
      endTime: request.body.endTime, //"2020-04-20T08:30:00"
      name: request.body.name,
      patient: request.body.patient,
      idno: request.body.idno,
      age: request.body.age,
      address: request.body.address,
      //phone: request.body.phone,
      mobile: request.body.mobile,
      // symptom: request.body.symptom,
    };
    console.log(eventData);
    addEventBooking(eventData, oAuth2Client)
      .then((data) => {
        response.json({ data });
        console.log(data);
        console.log("ok");
        return;
      })
      .catch((err) => {
        console.error("Error adding event: " + err.message);
        response.json({ ERROR_RESPONSE });
        return;
      });
    var hip: any = {};
    hip.date = moment(eventData.startTime).format("YYYY-MM-DD");
    hip.start = moment(eventData.startTime).format("hh-mm");
    hip.end = moment(eventData.endTime).format("hh-mm");

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
              // phone: event.phone,
              mobile: event.mobile,
              //symptom: event.symptom,
            },
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
