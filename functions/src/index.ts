import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const { google } = require("googleapis");
//const firebase_tools = require('firebase-tools');
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
  const infoData = {
    userInfo: request.body.userId,
  };
  const userData:any = db.collection('doctors').doc(infoData.userInfo);
  let doc:any  = await userData.get();
  try{
    if (!doc.exists) {
      console.log('No such document!');
    } else {
      var tempUser: any = {};
          tempUser.name = doc.data().name;
          tempUser.phone = doc.data().phone;
          tempUser.address = doc.data().address;
          tempUser.area = doc.data().area;
          tempUser.suburb = doc.data().suburb;
          tempUser.appointmentcalendar = doc.data().appointmentcalendar;
          tempUser.bookingcalendar = doc.data().bookingcalendar; 
          console.log(tempUser);
          
    }
  }catch (e) {
    console.error(e);
  }
  
  response.json(tempUser);
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
    var newItem: any = await listBookingEvents(oAuth2Client, min, max, bookingcalendarID);


    var map = new Map();
    newItem.forEach((value: any) => {
      let currKey = JSON.stringify(value);
      let currValue = map.get(currKey);
      if (currValue) {
        currValue.count += 1;
        map.set(currKey, currValue);
      } else {

        let newObj = {
          title: value.title,
          Date: value.Date,
          startTime: value.startTime,
          endTime: value.endTime,
          // slot: 1,
          count: 1
        }
        map.set(currKey, newObj);
      }
    })

    var res = Array.from(map).map(e => e[1]);


    var timeSlot: any = [];

    items.forEach((element: any) => {
      var element1: any = JSON.parse(element);
      element1.Slots.forEach((beforeBook: any) => {
        res.forEach((afterBook: any) => {
          if (beforeBook.date == afterBook.Date && beforeBook.startTime == afterBook.startTime && beforeBook.title == afterBook.title) {

            (beforeBook.available) = ((beforeBook.available) - (afterBook.count)).toString();
          }
        })
      });
      timeSlot.push(element1);
    });
    console.log(JSON.stringify(timeSlot));
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
            console.log(event.summary);
            var bTime: any = event.summary;
            var eventTitle: any = bTime;
            var boundry: any = bTime.split("-")[1];
            var eventavailable: any = bTime.split("-")[2];
            if (event.status == "confirmed") {
              var tempEvent: any = {};
              tempEvent.Date = moment(event.start.dateTime).format(
                "YYYY-MM-DD"
              );
              tempEvent.sTime = moment(event.start.dateTime).format();
              tempEvent.eTime = moment(event.end.dateTime).format();
              tempEvent.boundryTime = boundry;
              tempEvent.slotTitle = eventTitle;
              tempEvent.slotavailable = eventavailable;
              evv.push(tempEvent);
            }
          });
          var arr: any = [];

          evv.forEach(function (value: any) {
            var memo: any = {};
            console.log(value.sTime);
            console.log(value.boundryTime);
            memo.available = value.slotavailable;
            memo.title = value.slotTitle;
            memo.bStep = value.boundryTime;
            memo.date = value.Date;
            memo.start = value.sTime;
            memo.end = value.eTime;
            arr.push(memo);
          });


          for (let i of arr) {
            var titleSlot: any = { "title": i.title, Slots: [] };
            const range = moment.range(i.start, i.end);
            const rangeBy = range.by("minutes", { step: i.bStep });
            var result: any;
            result = Array.from(rangeBy).map((m: any) => ({
              date: i.date,
              startTime: moment(m).format("HH:mm"),
              endTime: moment(m.add(i.bStep, "m")).format("HH:mm"),
              available: i.available,
              title: i.title
            }));
            if (true) {
              // result[result.length - 1].endTime = moment(i.end).format("HH:mm");
              result.splice(-1, 1);
            }

            result.forEach((item: any) => {
              titleSlot.Slots.push({
                "date": item.date,
                "startTime": item.startTime,
                "endTime": item.endTime,
                "available": item.available,
                "title": item.title
              });
            });
            arrNoBook.push(JSON.stringify(titleSlot));
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
          console.log("Upcoming Booking events ****** :");
          let bookedEventList: any = [];
          events.forEach((event: any) => {
            var tempEvent: any = {};

            if (event.status == "confirmed") {
              tempEvent.title = event.extendedProperties.shared.title;
              tempEvent.Date = moment(event.start.dateTime).format(
                "YYYY-MM-DD"
              );
              tempEvent.startTime = moment(event.start.dateTime).format(
                "HH:mm"
              );
              tempEvent.endTime = moment(event.end.dateTime).format("HH:mm");
              //tempEvent.slot = 1;
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
      // patient: request.body.patientName,
      // idno: request.body.idno,
      // age: request.body.age,
      address: request.body.address,
      mobile: request.body.mobile,
      doctorName: request.body.doctorname,
      bookingcalendar: request.body.bookingcalendar,
      uniqueIdentifier: request.body.uniqueIdentifier,
      createDateTime: request.body.createDateTime,
      fullTitle: request.body.fullTitle,
    };
    //console.log(eventData);
    var min: any = moment.utc(eventData.startTime + "+05:30").toISOString();
    var max: any = moment.utc(eventData.endTime + "+05:30").toISOString();
    console.log(min + "time slot with utc" + max);
    var bookingcalendarID: any = eventData.bookingcalendar;

    var temp: any = await listBookingEvents(oAuth2Client, min, max, bookingcalendarID);

    console.log("hello listBookingEvents" + temp);
    console.log("hello min time" + min);
    console.log("hello starttime" + eventData.startTime);
    console.log("hello ID" + bookingcalendarID);

    // const myArrStr = JSON.stringify(temp);
    // console.log(myArrStr.length);
    // var x: any;
    // myArrStr.length == 2 ? (x = "1") : (x = "0");
    var map = new Map();
    temp.forEach((value: any) => {
      let currKey = JSON.stringify(value);
      let currValue = map.get(currKey);
      if (currValue) {
        currValue.count += 1;
        map.set(currKey, currValue);
      } else {

        let newObj = {
          title: value.title,
          Date: value.Date,
          startTime: value.startTime,
          endTime: value.endTime,
          count: 1
        }
        map.set(currKey, newObj);
      }
    })

    var filterdArray: any = Array.from(map).map(e => e[1]);
    console.log(filterdArray);

    var mainTitle = eventData.fullTitle;
    const myArrStr: any = JSON.stringify(filterdArray);
    var x;
    console.log(myArrStr.length);
    console.log(mainTitle);
    if (myArrStr.length == 2) {
      x = "1";
    } else {
      filterdArray.forEach((value: any) => {
        if (mainTitle == value.title) {
          var allSlots = (value.title).split('-')[2];
          if (allSlots > value.count) {
            x = "1";
          } else {
            x = "0";
          }
        } else {
          x = "1";
        }
      });
    }

    console.log(x);
    if (x == "1") {
      addEventBooking(eventData, oAuth2Client, bookingcalendarID)
        .then((data) => {
          console.log("ok");
          response.json({ data });

          return;
        })
        .catch((err) => {
          console.error("Error adding event: " + err);
          response.end({ ERROR_RESPONSE });
          return;
        });
    }

    var eventDetails: any = {};
    console.log(eventData);
    console.log(eventData.startTime);
    eventDetails.eventName = eventData.eventName;
    eventDetails.date = moment(eventData.startTime).format("YYYY-MM-DD");
    eventDetails.start = moment(eventData.startTime).format("HH:mm");
    eventDetails.end = moment(eventData.endTime).format("HH:mm");
    eventDetails.name = eventData.name;
    // eventDetails.patient = eventData.patient;
    // eventDetails.idno = eventData.idno;
    // eventDetails.age = eventData.age;
    eventDetails.address = eventData.address;
    eventDetails.mobile = eventData.mobile;
    eventDetails.bValue = x;
    eventDetails.title = eventData.fullTitle;
    console.log(eventDetails);
    console.log(eventData.doctorName);
    // response.json(eventDetails);

    const dataLog = {
      doctorName: eventData.doctorName,
      startDateTime: eventData.startTime,
      endDateTime: eventData.endTime,
      name: eventData.name,
      // patient: eventData.patient,
      // idNo: eventData.idno,
      // age: eventData.age,
      address: eventData.address,
      mobile: eventData.mobile,
      userId: eventData.uniqueIdentifier,
      bValue: x,
      title: eventData.fullTitle,
      createDateTime: eventData.createDateTime,
    };
    const res = await db
      .collection("log")
      .doc(eventData.uniqueIdentifier + Number(new Date(eventData.startTime)))
      .set(dataLog);

    console.log("Set: ", res);

    if (x == "1") {
      const user = await db
        .collection("user")
        .doc(eventData.uniqueIdentifier)
        .collection(eventData.startTime)
        .doc(eventData.doctorName)
        .set(dataLog);

      console.log("Set: ", user);
    }
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
            // "   Patient  :" +
            // event.patient +
            // "   Idno  :" +
            // event.idno +
            // "   Age  :" +
            // event.age +
            "   Address  :" +
            event.address +
            "   Mobile  :" +
            event.mobile +
            "   Title  :" +
            event.fullTitle,
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
              // patient: event.patient,
              // idno: event.idno,
              // age: event.age,
              address: event.address,
              mobile: event.mobile,
              title: event.fullTitle,
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

export const GetUserData = functions.https.onRequest(
  async (request, response) => {
    const userIdData = {
      uID: request.body.uniqueIdentifier,
      clearLogID: request.body.clearLogId,
    };
    const userEmi: any = userIdData.uID; //"5cjkac68asscni88888936";
    const clearEmi: any = userIdData.clearLogID;
    console.log(userEmi);
    console.log(clearEmi);
    var userArr: any = [];
    var promises: any = [];
    var finalUserData: any = [];
    var bookData: any = await bookList(userEmi);
    if (userEmi == clearEmi) {
      var userRemove: any = await clearLog(userEmi);
      console.log(userRemove);
      var Arr: any = [];
      finalUserData.push(Arr);

    } else {

      promises = bookData.map(async (value: any) => {
        const userData: any = db
          .collection("user")
          .doc(userEmi)
          .collection(value);

        const snapshot = await userData.get();

        snapshot.forEach((doc: any) => {
          var temp: any = {};
          temp = doc.data();
          console.log(temp);
          userArr.push(temp);
        });
      });

      await Promise.all(promises);
      finalUserData.push(userArr);
    }
    console.log(finalUserData);
    response.json(finalUserData);
  }
);

function bookList(userEmi: any) {
  return new Promise(async function (resolve, reject) {
    admin.firestore().collection;
    var userArr: any = [];
    try {
      const sfRef = db.collection("user").doc(userEmi);
      const collections = await sfRef.listCollections();
      collections.forEach((collection) => {
        var temp: any = {};
        temp = collection.id;
        userArr.push(temp);
      });
    } catch (e) {
      console.error(e);
    }
    resolve(userArr);
  });
}

function clearLog(userEmi: any) {
  return new Promise(async function (resolve, reject) {
    var bookData: any = await bookList(userEmi);
    var promises: any = [];
    promises = bookData.map(async (value: any) => {
      const userData: any = db
        .collection("user")
        .doc(userEmi)
        .collection(value);

      const snapshot = await userData.get();

      snapshot.forEach((doc: any) => {
        const clearUser: any = db
          .collection("user")
          .doc(userEmi)
          .collection(value)
          .doc(doc.id)
          .delete();
        console.log(clearUser);
      });
    });

    await Promise.all(promises);
    resolve("successfully deleted!");
  });
}
