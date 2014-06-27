/** @jsx React.DOM */

// backbone hoodie connector go!
Backbone.hoodie.connect();

var Spark = Backbone.Model.extend({

  // backbone-hoodie needs this
  type: 'spark',

  // Default attributes for the Spark
  defaults: {
    text: '',
    when: null,
    last_edit: null
  },

  cook: function(new_val){
    var text = new_val || this.get("text");
    this.set("cooked", markdown.toHTML(text));
  },

  initialize: function() {
    if(!this.has('when')) {
        this.set('when', moment());
    }

    if (!this.has("cooked")){
      this.cook();
    }
  }
});

var SparkList = Backbone.Collection.extend({

  // Reference to this collection's model.
  model: Spark,

  // sparks are sorted by their original insertion order.
  comparator: function (spark) {
    return - moment(spark.get('when')).diff(moment());
  }
});

var Utils = {
  pluralize: function( count, word ) {
    return count === 1 ? word : word + 's';
  },

  stringifyObjKeys: function(obj) {
    var s = '';
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) {
        continue;
      }
      if (obj[key]) {
        s += key + ' ';
      }
    }
    return s;
  }
};

// Begin React stuff

var Editor = React.createClass({
  onChange: function(ev){
    this.props.onChange(ev.target.value);
  },
  render: function(){
    return (<div id="editor">
              <textarea
                onChange={this.onChange}
                value={this.props.editText} />
              <div className="actions">
                <button className="expand-action" onClick={this.props.onSave}>
                  <span className="fa fa-2x fa-check-circle "></span>
                </button>
                <button className="expand-action" onClick={this.props.onClose}>
                  <span className="fa fa-2x fa-times-circle-o"></span>
                </button>
              </div>
            </div>
      );
  }
});

var SparkItem = React.createClass({
  expand: function() {
    this.props.onExpand(this.props.spark)
  },
  destroy: function() {
    confirm("Are you sure you want to delete that spark?") && this.props.spark.destroy();
  },

  edit: function() {
    this.props.onEdit(this.props.spark)
  },

  render: function() {
    var classes = Utils.stringifyObjKeys({
      "spark-item": true,
      expanded: this.props.expanded,
      editing: this.props.editing
    });
    return (
      <li id={this.props.spark.get("id")} className={classes} onClick={this.expand} >
        <div className="view">
          <span className="when">{moment(this.props.spark.get("when")).fromNow()}</span>
          <div className="spark" dangerouslySetInnerHTML={{
            __html: this.props.spark.get("cooked")
          }}>
          </div>
          <div className="actions">
            <button className="expand-action" onClick={this.edit}>
              <span className="fa fa-2x fa-pencil-square-o"></span>
            </button>
            <button className="expand-action" onClick={this.destroy}>
              <span className="fa fa-2x fa-trash-o"></span>
            </button>
          </div>
        </div>
      </li>
    );
  }
});

// An example generic Mixin that you can add to any component that should react
// to changes in a Backbone component. The use cases we've identified thus far
// are for Collections -- since they trigger a change event whenever any of
// their constituent items are changed there's no need to reconcile for regular
// models. One caveat: this relies on getBackboneModels() to always return the
// same model instances throughout the lifecycle of the component. If you're
// using this mixin correctly (it should be near the top of your component
// hierarchy) this should not be an issue.
var BackboneMixin = {
  componentDidMount: function() {
    // Whenever there may be a change in the Backbone data, trigger a reconcile.
    this.getBackboneModels().forEach(function(model) {
      model.on('add change remove', this.forceUpdate.bind(this, null), this);
    }, this);
  },

  componentWillUnmount: function() {
    // Ensure that we clean up any dangling references when the component is
    // destroyed.
    this.getBackboneModels().forEach(function(model) {
      model.off(null, null, this);
    }, this);
  }
};

var SparkHeader = React.createClass({

  getInitialState: function(){
    return {showBox: false, email: "", password:""};
  },

  componentDidMount: function(){
    if (!this.props.user){
      this.setState({"showBox": "notLoggedIn"})
    }
  },

  startLogin: function(){
    if (this.props.user){
      this.setState({showBox: "logout"});
    } else {
      this.setState({showBox: "showSignIn"});
    }
  },

  signInSubmit: function(){
    this.setState({showBox: "loading"});
    Backbone.hoodie.account.signIn(this.state.email, this.state.password
        ).done(function(resp){
          this.setState({showBox: false});
        }.bind(this)).fail(function(){
          this.setState({showBox: "signUpInstead"});
        }.bind(this));
  },

  signUp: function(){
    this.setState({showBox: "loading"});
    Backbone.hoodie.account.signUp(this.state.email, this.state.password
      ).done(function(resp){
          this.setState({showBox: false});
      }.bind(this)
      ).fail(function(){
        this.setState({showBox: "signUpFailed"});
      }.bind(this));
  },

  signOut: function(){
    this.setState({showBox: "loading"});
    Backbone.hoodie.account.signOut().done(function(){
      this.setState({showBox: "notLoggedIn"})
    }.bind(this));
  },

  onEmailChange: function(ev){
    this.setState({email: ev.target.value});
  },
  onPasswordChange: function(ev){
    this.setState({password: ev.target.value});
  },

  dismiss: function() {
    this.setState({showBox: false});
  },

  render: function(){
    var message = null,
        sparkStyle = {"color": "green", "cursor": "pointer"},
        sparkTitle = "checking";
    if (!this.props.user) {
      sparkStyle["color"] = "rgba(179, 114, 114, 1)";
    } else {
      sparkTitle = "you are : "+ this.props.user;
    }

    switch (this.state.showBox) {
      case "notLoggedIn":
        message = (
                <div className="alert alert-error">
                    <button className="dismiss" onClick={this.dismiss}>x</button>
                    <h3>Not logged in</h3>
                    <p>Without being logged in, the data is only stored locally and won`t be synced accross devices.</p>
                    <button className="sign-in" onClick={this.startLogin}>Sign in now.</button>
                </div>
              );
        break;
      case "showSignIn":
        message = (
                <div className="alert">
                    <button className="dismiss" onClick={this.dismiss}>x</button>
                    <h3>Sign in</h3>
                    <form onSubmit={this.signInSubmit}>
                      <label>Email</label><input name="email" onChange={this.onEmailChange} type="email"/>
                      <label>password</label><input name="password" onChange={this.onPasswordChange} type="password"/>
                      <button className="sign-in" type="submit">Sign in now.</button>
                    </form>
                </div>
              );
        break;
      case "logout":
        message = (
                <div className="alert">
                    <button className="dismiss" onClick={this.dismiss}>x</button>
                    <h3>You are currently signed in as {this.props.user}</h3>
                    <button className="sign-out" onClick={this.signOut}>Sign out now.</button>
                </div>
              );
        break;
      case "loading":
        message = (
                <div className="alert">
                    Loading..
                </div>
              );
        break;
      case "signUpFailed":
        message = (
                <div className="alert alert-error">
                    <button className="dismiss" onClick={this.dismiss}>x</button>
                    <h3>Sign up failed</h3>
                    <p>Please try again with a different name</p>
                    <button className="sign-in" onClick={this.startLogin}>try again</button>
                </div>
              );
        break;
      case "signUpInstead":
        message = (
                <div className="alert alert-error">
                    <button className="dismiss" onClick={this.dismiss}>x</button>
                    <h3>Sign in failed</h3>
                    <p> how do you want to continue?</p>
                    <button className="sign-in" onClick={this.startLogin}>try again</button>
                    <button className="sign-up" onClick={this.signUp}>sign up with that account</button>
                </div>
              );
        break;
      }

    return (
        <header id="header">
              <h1 className="app-title">sparks<span title={sparkTitle} style={sparkStyle} onClick={this.startLogin}>*</span></h1>
              {message}
        </header>
      );
  }

});

var SparkApp = React.createClass({
  mixins: [BackboneMixin],
  getInitialState: function() {
    return {editing: null, expanded: null,
        user: Backbone.hoodie.account.username ? Backbone.hoodie.account.username: false,
        editText: ""};
  },

  componentDidMount: function() {
    var app = this;
    function userIn(user){
      app.props.sparks.fetch();
      app.setState({"user": user});
    };

    this.props.sparks.fetch();

    Backbone.hoodie.account.on('authenticated', userIn);
    Backbone.hoodie.account.on('signin', userIn);
    Backbone.hoodie.account.on('signup', userIn);
    Backbone.hoodie.account.on('signout', function(){
      this.setState({"user": null});
      this.props.sparks.fetch();
    }.bind(this));
  },

  componentDidUpdate: function() {
    // If saving were expensive we'd listen for mutation events on Backbone and
    // do this manually. however, since saving isn't expensive this is an
    // elegant way to keep it reactively up-to-date.
    this.props.sparks.forEach(function(spark) {
      spark.save();
    });
  },

  getBackboneModels: function() {
    return [this.props.sparks];
  },

  onTextChange: function (new_val) {
    this.state.editing.cook(new_val);
    this.setState({editText: new_val});
  },

  onEditClose: function(){
    if (this.state.editing) this.state.editing.cook();
    this.setState({"editing": null});
  },

  onEditSave: function(){
    if (!this.state.editText || this.state.editText.length <= 1) {
      this.state.editing.destroy();
    } else{
      this.state.editing.set("text", this.state.editText);
      this.state.editing.cook();
      this.state.editing.save();
    }
    this.setState({"editing": null});
  },

  onEdit: function(spark){
    this.setState({editing: spark, editText: spark.get("text")});
    $("html").animate({"scrollTop": $("#" + spark.get("id")).offset().top}, 1000);
  },

  startNew: function(){
    var spark = this.props.sparks.create({text: "#", when: moment()});
    this.onEdit(spark);
  },

  onExpand: function(spark){
    this.setState({expanded: this.state.expanded != spark ? spark : null});
  },

  render: function() {
    var main = null,
        footer = null,
        editor = null,
        sparkItems = this.props.sparks.map(function(spark) {
          return (
            <SparkItem
              key={spark.id}
              onEdit={this.onEdit}
              onExpand={this.onExpand}
              expanded={this.state.expanded == spark}
              editing={this.state.editing == spark}
              spark={spark} />
          );
        }, this);

    if (sparkItems.length) {
      main = (
        <section id="main">
          <ul id="spark-list">
            {sparkItems}
          </ul>
        </section>
      );
    }

    if (this.state.editing){
      editor = (
            <Editor
              onChange={this.onTextChange}
              editText={this.state.editText}
              onClose={this.onEditClose}
              onSave={this.onEditSave}
              spark={this.state.editing} />
        );
    } else {
      editor = (
          <button id="startNew"
            onClick={this.startNew}
          > <span className="fa fa-plus-circle"></span> Add a spark
          </button>
        )
    }

    var classNames = Utils.stringifyObjKeys({
      expanded: this.state.expanded != null, editing: this.state.editing != null
    });

    return (
      <div>
        {editor}
        <section id="sparkapp" className={classNames}>
          <SparkHeader user={this.state.user} />
          {main}
          {footer}
        </section>
        <footer id="info">
          <p>Inspired by <a href="https://medium.com/the-writers-room/the-spark-file-8d6e7df7ae58">Steven Johnson`s "The Spark File" </a></p>
        </footer>
      </div>
    );
  }
});

React.renderComponent(
  <SparkApp sparks={new SparkList()} />, document.getElementById('container')
);
