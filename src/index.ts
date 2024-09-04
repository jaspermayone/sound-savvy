import express, { Request, Response } from "express";
import twilio, { twiml as Twiml } from "twilio";
// @ts-expect-error
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import fs from "node:fs";
import xml2js from "xml2js";

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error("Twilio credentials are missing.");
}
const base64Auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

// Middleware to parse incoming requests
app.use(bodyParser.urlencoded({ extended: false }));

// Route to handle incoming calls
app.post("/voice", async (req: Request, res: Response) => {
  const twiml = new Twiml.VoiceResponse();

  // console log the request body
  console.log(req.body);

  let clr = req.body.Caller;
  // remove the + followed by the country code
  if (clr.startsWith("+1")) {
    clr = clr.slice(2);
  }

  const dbUser = await prisma.user.findUnique({
    where: {
      phoneNumber: clr,
    },
  });

  if (!dbUser) {
    twiml.say(
      "Your account was not found. Please enter your unique identifier.",
    );

    twiml.gather({
      action: "/user-identifier",
      method: "POST",
      numDigits: 10,
    });

    // Send back TwiML response
    res.type("text/xml");
    return res.send(twiml.toString());
  } else {
    // await prisma.call.create({
    //   data: {
    //     CallerCountry: req.body.CallerCountry,
    //     CallSid: req.body.CallSid,
    //     StirVerstat: req.body.StirVerstat,
    //     ApiVersion: req.body.ApiVersion,
    //     AccountSid: req.body.AccountSid,
    //     Caller: req.body.Caller,
    //     FromCity: req.body.FromCity,
    //     FromZip: req.body.FromZip,
    //     FromState: req.body.FromState,
    //     FromCountry: req.body.FromCountry,
    //     User: {
    //       connect: {
    //         phoneNumber: req.body.Caller,
    //       },
    //     },
    //   },
    // });

    twiml.say(
      "Please leave a message at the beep.\nPress the star key when finished.",
    );

    twiml.record({
      action: "/recording-status",
      method: "POST",
      maxLength: 20,
      finishOnKey: "*",
    });

    twiml.hangup();

    // // Send back TwiML response
    res.type("text/xml");
    return res.send(twiml.toString());
  }
});

app.post("/user-identifier", async (req: Request, res: Response) => {
  const twiml = new Twiml.VoiceResponse();

  const dbUser = await prisma.user.findUnique({
    where: {
      phoneNumber: req.body.Digits,
    },
  });

  if (!dbUser) {
    twiml.say(
      "Your unique identifier was not found. Please try again. Goodbye.",
    );
    twiml.hangup();
  } else {
    twiml.say(
      `Hi. You have been identified as ${dbUser.firstName}.\nYour account has been found. Please leave a message at the beep.\nPress the star key or hang up when finished.`,
    );

    twiml.record({
      action: "/recording-status",
      method: "POST",
      maxLength: 20,
      finishOnKey: "*",
    });

    twiml.hangup();
  }

  res.type("text/xml");
  return res.send(twiml.toString());
});

// Webhook to handle recording status updates
app.post("/recording-status", async (req: Request, res: Response) => {
  try {
    const recordingUrl = req.body.RecordingUrl;
    console.log("\n\n Recording URL: ", recordingUrl, "\n\n");

    const recordingSid = recordingUrl.split("/").pop();
    console.log("Recording SID: ", recordingSid);

    const recordingResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.json`,
      {
        headers: {
          Authorization: `Basic ${base64Auth}`,
          Accept: "application/json",
        },
      },
    );

    console.log("Recording Response Data: ", recordingResponse.data);

    const mediaUrl = recordingResponse.data.media_url;
    if (!mediaUrl) {
      throw new Error("Media URL is undefined.");
    }

    console.log("Media URL: ", mediaUrl);

    // Fetch the media file (recording)
    const mediaResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Basic ${base64Auth}` },
      responseType: "arraybuffer",
    });

    if (mediaResponse.headers["content-type"] !== "audio/mpeg") {
      // The response is not the expected audio file, try to parse the XML
      const xmlError = await xml2js.parseStringPromise(
        mediaResponse.data.toString(),
      );
      console.error("Twilio XML Error Response: ", xmlError);
      throw new Error(
        "Failed to fetch the recording media. XML error response received.",
      );
    }

    const mediaSid = recordingResponse.data.sid;

    fs.writeFileSync(`./recordings/${mediaSid}.mp3`, mediaResponse.data, {
      encoding: "binary",
    });

    res.type("text/xml");
    res.send(
      "<Response><Say>Thank you for your message.\nYour response has been saved to your account.</Say></Response>",
    );
  } catch (error: any) {
    console.error(
      "Failed to fetch recording:",
      error.response ? error.response.data : error.message,
    );

    res.type("text/xml");
    res.send(
      "<Response><Say>There was an error saving your message. Please try again later.</Say></Response>",
    );
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
