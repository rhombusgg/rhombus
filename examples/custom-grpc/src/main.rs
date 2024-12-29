use rhombus::{
    axum::Router,
    internal::{database::provider::Connection, router::RouterState},
    plugin::{PluginMeta, RunContext},
    Plugin, Result,
};
use tonic::async_trait;
use tracing::info;
use tracing_subscriber::EnvFilter;

pub mod proto {
    use tonic::{include_file_descriptor_set, include_proto};

    pub const FILE_DESCRIPTOR_SET: &[u8] =
        tonic::include_file_descriptor_set!("myplugin_descriptor");
    include_proto!("myplugin");
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .or_else(|_| EnvFilter::try_new("rhombus=trace,plugin=trace"))
                .unwrap(),
        )
        .init();

    let app = rhombus::Builder::default()
        .load_env()
        .config_source(rhombus::config::File::with_name("config"))
        .upload_provider(rhombus::LocalUploadProvider::new("uploads".into()))
        .plugin(MyPlugin)
        .build()
        .await
        .unwrap();

    let addr = "0.0.0.0:3000";
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("Listening on {}", addr);
    app.serve(listener).await;
}

struct MyPlugin;

#[async_trait]
impl Plugin for MyPlugin {
    fn meta(&self) -> PluginMeta {
        PluginMeta {
            name: env!("CARGO_PKG_NAME").into(),
            version: env!("CARGO_PKG_VERSION").into(),
            description: env!("CARGO_PKG_DESCRIPTION").into(),
        }
    }

    async fn run(&self, context: &mut RunContext<'_>) -> Result<Router<RouterState>> {
        println!("ADDING THE THING");
        context
            .grpc_builder
            .add_service(proto::my_plugin_server::MyPluginServer::new(GrpcImpl {
                db: context.db.clone(),
            }))
            .register_encoded_file_descriptor_set(proto::FILE_DESCRIPTOR_SET);

        Ok(Router::new())
    }
}

pub struct GrpcImpl {
    pub db: Connection,
}

#[async_trait]
impl proto::my_plugin_server::MyPlugin for GrpcImpl {
    async fn reverse_user_name(
        &self,
        request: tonic::Request<proto::ReverseUserNameRequest>,
    ) -> std::result::Result<tonic::Response<proto::ReverseUserNameReply>, tonic::Status> {
        // return Err(tonic::Status::internal("TEST INTERNAL ERROR"));
        let user_id = request.into_inner().user_id;
        let user = self
            .db
            .get_user_from_id(user_id)
            .await
            .map_err(|_| tonic::Status::not_found("failed to get user"))?;
        let new_user_name = user.name.chars().rev().collect::<String>();
        self.db
            .set_account_name(user.id, user.team_id, &new_user_name, 0)
            .await
            .map_err(|_| tonic::Status::internal("failed to update user name"))?
            .map_err(|_| tonic::Status::internal("failed to update user name"))?;
        Ok(tonic::Response::new(proto::ReverseUserNameReply {
            new_user_name,
        }))
    }
}
