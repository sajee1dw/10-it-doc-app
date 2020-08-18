import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const calendar = google.calendar("v3");

const googleCredentials = require("../keys/credentials.json");

admin.initializeApp({
  credential: admin.credential.cert(require("../keys/admin.json")),
  databaseURL: "https://book-my-doctor-eadd7.firebaseio.com",
});
const Moment = require("moment");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment);
const db = admin.firestore();

//**----------------------------- response area,suberb,doctors function: [1] ----start

export const GetDoctorsAreaList = functions.https.onRequest(
  async (request, response) => {
    admin.firestore().collection;
    const docInfo: any = {};
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
          tempDoc.area = doc.data().area;
          tempDoc.suburb = doc.data().suburb;
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

export const GetInfo = functions.https.onRequest(async (request, response) => {
  let doctorsRef = db.collection("doctors");
  const infoData = {
    docArea: request.body.docArea,
    docSuburb: request.body.docSuburb,
    docName: request.body.docName,
  };
  console.log(infoData);
  let query = doctorsRef
    .where("area", "==", infoData.docArea)
    .where("suburb", "==", infoData.docSuburb)
    .where("name", "==", infoData.docName)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        console.log("No matching documents.");
        return;
      }
      snapshot.forEach((doc: any) => {
        var tempDoctor: any = {};
        tempDoctor.name = doc.data().name;
        tempDoctor.phone = doc.data().phone;
        tempDoctor.address = doc.data().address;
        tempDoctor.appointmentcalendar = doc.data().appointmentcalendar;
        tempDoctor.bookingcalendar = doc.data().bookingcalendar; // ||"N/A"
        console.log(tempDoctor);
        response.json(tempDoctor);
      });
    })
    .catch((err) => {
      console.log("Error getting documents", err);
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
const TIME_ZONE = "Time zone in Katubedda, Moratuwa (GMT+5:30)"; //EST  +5:30

//**------------------------- response doctors booking time slots['date','starttime','endtime']  function [3] ----start
var reqDate: any;
export const GetDoctorBookingCalendar = functions.https.onRequest(
  async (request, response) => {
    reqDate = {
      date: request.body.date, //"2020-07-31 00:00:00.000"//request.body.date
      bookingcalendar: request.body.bookingcalendar,
      appointmentcalendar: request.body.appointmentcalendar,
    };
    console.log(reqDate.date);
    console.log(reqDate.appointmentcalendar);
    console.log(reqDate.bookingcalendar);
    var min: any = moment().subtract(1, "days").endOf("day").toISOString();
    var max: any = moment().add(1, "days").endOf("day").toISOString();
    var appointmentcalendarID: any = reqDate.appointmentcalendar;
    var bookingcalendarID: any = reqDate.bookingcalendar;
    var items: any = await listEvents(oAuth2Client, appointmentcalendarID);
    var newItem: any = await listBookingEvents(
      oAuth2Client,
      min,
      max,
      bookingcalendarID
    );
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

function listEvents(auth: any, appointmentcalendarID: any) {
  return new Promise((resolve, reject) => {
    const calendar2 = google.calendar({ version: "v3", auth });
    var firstTime = moment(reqDate.date, "YYYY-MM-DD h:m").toISOString();
    var lastTime = moment(reqDate.date, "YYYY-MM-DD h:m")
      .endOf("day")
      .toISOString();
    var min = moment().startOf("day").toISOString();
    var max = moment().endOf("day").toISOString();

    calendar2.events.list(
      {
        calendarId: appointmentcalendarID, //"primary"
        timeMin: !reqDate.date ? min : firstTime, //moment().startOf('day').toISOString(), //moment().subtract(1, "days").toISOString(),
        timeMax: !reqDate.date ? max : lastTime, //moment().endOf('day').toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: "startTime",
      },
      (err: any, res: any) => {
        // if (err) return console.log("The API returned an error: " + err);
        const events = res.data.items;
        if (events) {
          console.log("Upcoming 100 events:");
          var evv: any = [];
          var arrNoBook: any = [];
          events.forEach((event: any) => {
            if (event.status == "confirmed") {
              var tempEvent: any = {};
              tempEvent.Date = moment(event.start.dateTime).format(
                "YYYY-MM-DD"
              );
              tempEvent.sTime = moment(event.start.dateTime).format();
              tempEvent.eTime = moment(event.end.dateTime).format();
              evv.push(tempEvent);
            }
          });
          var arr: any = [];

          evv.forEach(function (value: any) {
            var memo: any = {};
            console.log(value.sTime);

            memo.date = value.Date;
            memo.start = value.sTime;
            memo.end = value.eTime;
            arr.push(memo);
          });
          for (let i of arr) {
            const range = moment.range(i.start, i.end);
            const rangeBy = range.by("minutes", { step: 15 });
            var result: any = {};
            result = Array.from(rangeBy).map((m: any) => ({
              date: i.date,
              startTime: moment(m).format("HH:mm"),
              endTime: moment(m.add(15, "m")).format("HH:mm"),
              slot: 0,
            }));
            if (true) {
              result[result.length - 1].endTime = moment(i.end).format("HH:mm");
            }
            arrNoBook.push(result);
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
  async (request, response) => {
    var min: any = moment().subtract(1, "days").endOf("day").toISOString();
    var max: any = moment().add(1, "days").endOf("day").toISOString();
    var bookingcalendarID: any = reqDate.bookingcalendar;
    let temp = await listBookingEvents(
      oAuth2Client,
      min,
      max,
      bookingcalendarID
    );
    console.log(temp);
    response.json(temp);
  }
);

function listBookingEvents(
  auth: any,
  minDate: any,
  maxDate: any,
  bookingcalendarID: any
) {
  return new Promise((resolve: any, reject) => {
    const calendar2 = google.calendar({ version: "v3", auth });
    calendar2.events.list(
      {
        calendarId: bookingcalendarID, //"mt6pgiacc0bqjqg5s86seh9qs4@group.calendar.google.com", //tempDoctor.bookingcalendar
        timeMin: minDate, //moment().subtract(1, "days").endOf("day").toISOString(),
        timeMax: maxDate, //moment().add(1, "days").endOf("day").toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: "startTime",
      },
      (err: any, res: any) => {
        const events = res.data.items; //res.data.items
        if (events) {
          console.log("Upcoming 100 events:");
          let bookedEventList: any = [];
          events.forEach((event: any) => {
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
            }
          });
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
      patient: request.body.patientName,
      idno: request.body.idno,
      age: request.body.age,
      address: request.body.address,
      mobile: request.body.mobile,
      bookingcalendar: request.body.bookingcalendar,
    };
    var min: any = moment.utc(eventData.startTime + "+05:30").toISOString();
    var max: any = moment.utc(eventData.endTime + "+05:30").toISOString();

    var bookingcalendarID: any = eventData.bookingcalendar;
    var temp = await listBookingEvents(
      oAuth2Client,
      min,
      max,
      bookingcalendarID
    );

    console.log("hello listBookingEvents" + temp);
    console.log("hello min time" + min);
    console.log("hello starttime" + eventData.startTime);
    console.log("hello ID" + bookingcalendarID);

    const myArrStr = JSON.stringify(temp);
    console.log(myArrStr.length);
    var x: any;
    myArrStr.length == 2 ? (x = "1") : (x = "0");
    if (x == 1) {
      addEventBooking(eventData, oAuth2Client, bookingcalendarID)
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
    }

    var eventDetails: any = {};
    console.log(eventData);
    console.log(eventData.startTime);
    eventDetails.date = moment(eventData.startTime).format("YYYY-MM-DD");
    eventDetails.start = moment(eventData.startTime).format("HH:mm");
    eventDetails.end = moment(eventData.endTime).format("HH:mm");
    eventDetails.name = eventData.name;
    eventDetails.patient = eventData.patient;
    eventDetails.idno = eventData.idno;
    eventDetails.age = eventData.age;
    eventDetails.address = eventData.address;
    eventDetails.mobile = eventData.mobile;
    eventDetails.bValue = x;
    console.log(eventDetails);
    response.json(eventDetails);
  }
);

function addEventBooking(event: any, auth: any, bookingcalendarID: any) {
  return new Promise(function (resolve, reject) {
    calendar.events.insert(
      {
        auth: auth,
        calendarId: bookingcalendarID,

        resource: {
          summary: event.eventName,
          description:
            "Creator Name  :" +
            event.name +
            "   Patient  :" +
            event.patient +
            "   Idno  :" +
            event.idno +
            "   Age  :" +
            event.age +
            "   Address  :" +
            event.address +
            "   Mobile  :" +
            event.mobile,
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
              mobile: event.mobile,
            },
          },
        },
      },
      (err: any, response: any) => {
        if (err) {
          console.log("Rejecting because of error");
          reject(err);
        }
        console.log("Request successful");
        resolve(response.data);
      }
    );
  });
}
