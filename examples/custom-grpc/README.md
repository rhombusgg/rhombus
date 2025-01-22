# custom-grpc

An example of a plugin that adds custom GRPC methods.

### Running this example

Run `cargo run` in this directory. Then go to http://localhost:3000 and make a user. (Make sure its name is not palindromic!)

Then you can run

```sh
grpcurl -d '{"userId":1}' -plaintext -msg-template localhost:3000 myplugin.MyPlugin.ReverseUserName
```

to reverse the user's name.
