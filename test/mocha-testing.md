// First, run DB server
lavioli:~/workspace/sup-messaging-api (master) $ ./run_mongod

// Run all Mocha tests
lavioli:~/workspace/sup-messaging-api (master) $ mocha

// Run User endpoint tests only
lavioli:~/workspace/sup-messaging-api (master) $ mocha -g "User endpoints"

// Run Message endpoint tests only
lavioli:~/workspace/sup-messaging-api (master) $ mocha -g "Message endpoints"