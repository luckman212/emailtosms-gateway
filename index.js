const parser = require("lambda-multipart-parser");
const client = require("twilio")(
  process.env.ACCOUNT_SID,
  process.env.AUTH_TOKEN
);

/**
 *
 * @param {String} from - FROM parameter passed from SendGrid
 * @returns {String} Containing email address
 */
const extractEmails = from => {
  return from.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
};

/**
 *
 * @param {String} from - FROM parameter passed from SendGrid
 * @returns {Boolean}
 */
const validateSender = from => {
  let emails = extractEmails(from);
  let isValid = false;
  let domains = process.env.DOMAINS.split(",");
  domains.forEach(domain => {
    if (emails[0].indexOf(domain) >= 0) {
      isValid = true;
    }
  });

  return isValid;
};

exports.handler = async event => {
  let data = await parser.parse(event);
  console.log("input data: ", data);

  if (validateSender(data.from)) {
    // parse the to number from the left-hand side of the email address
    let regexp = /(^.\d+[^@])/g;
    let env_to = JSON.parse(data.envelope).to[0];
    let to = env_to.match(regexp)[0];
    let body = `${data.subject} ${data.text}`;

    let message;
    
    try {
      message = await client.messages.create({
        body: body,
        from: process.env.FROM,
        to: to
      });
    } catch(err) {
      console.log(err)
    }

    console.log("Message Output: ", message);
    const response = {
      statusCode: 200,
      body: JSON.stringify({ input: data, output: message })
    };
    return response;
  } else {
    const response = {
      statusCode: 403,
      body: "Unauthorized Sender"
    };
    return response;
  }
};
