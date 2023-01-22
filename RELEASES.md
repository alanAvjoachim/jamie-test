# Release Step-by-step

There is a Github Action in place that automatically builds the electron application and publishes it to a public repo so auto update will work. Certificates for Mac are in place and the Github action automatically signs & notarizes the mac application.

Public release repo: https://github.com/louismorgner/jamie-release

However, manual code signing is needed for the windows app. For this, the code signing certificate is on Louis' local machine.

To get the certificate (.p12 or other format) into CI/CD, you can create a base64 encoded file and copy & paste the contents with this command:

openssl base64 -in apple-certs.p12 -out apple-certs.b64

Based on https://codycallahan.com/blog/deploying-electron-with-github-actions-macos/
