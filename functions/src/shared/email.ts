const Recipient = require("mailersend").Recipient;
const EmailParams = require("mailersend").EmailParams;
const MailerSend = require("mailersend");

const mailersend = new MailerSend({
  api_key: process.env.MAILERSEND_TOKEN
});

const fromEmail =
  // eslint-disable-next-line max-len
  process.env.NODE_ENV === "production" ? "hey@meetjamie.ai" : "hey@dev.meetjamie.ai";

export async function sendEmail(
  recipients: Array<{ email: string; name: string }>,
  subject: string,
  body: string,
  templateId: string,
  variables: any
) {
  const to = recipients.map((recipient) => {
    return new Recipient(recipient.email, recipient.name);
  });

  let emailParams;
  console.log(templateId, variables);

  if (templateId == undefined) {
    emailParams = new EmailParams()
      .setFrom(fromEmail)
      .setFromName("jamie")
      .setReplyTo(fromEmail)
      .setReplyToName("jamie")
      .setSubject(subject)
      .setRecipients(to)
      .setHtml(body);
  } else {
    emailParams = new EmailParams()
      .setFrom(fromEmail)
      .setFromName("jamie")
      .setReplyTo(fromEmail)
      .setReplyToName("jamie")
      .setSubject(subject)
      .setRecipients(to)
      .setVariables(variables)
      .setTemplateId(templateId);
  }
  await mailersend.send(emailParams);
}
