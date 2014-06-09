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

  initialize: function() {
    if(!this.has('when')) {
        this.set('when', moment());
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
                defaultValue={this.props.editText} />
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

  edit: function() {
    this.props.onEdit(this.props.spark)
  },

  render: function() {
    var classes = Utils.stringifyObjKeys({
      expanded: this.props.expanded, editing: this.props.editing
    });
    return (
      <li className={classes}>
        <div className="view">
          <span className="when">{moment(this.props.spark.get("when")).fromNow()}</span>
          <div className="spark" onClick={this.expand} dangerouslySetInnerHTML={{
            __html: markdown.toHTML(this.props.editing ? this.props.editText : this.props.spark.get('text'))
          }}>
          </div>
          <div className="actions">
            <button className="expand-action" onClick={this.edit}>
              <span className="fa fa-2x fa-pencil-square-o"></span>
            </button>
            <button className="expand-action" onClick={this.props.onDestroy}>
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

var SparkApp = React.createClass({
  mixins: [BackboneMixin],
  getInitialState: function() {
    return {editing: null, expanded: null, editText: ""};
  },

  componentDidMount: function() {
    this.props.sparks.fetch();
    this.refs.newField.getDOMNode().focus();
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

  handleSubmit: function(event) {
    event.preventDefault();
    var val = this.refs.newField.getDOMNode().value.trim();
    if (val) {
      this.props.sparks.create({
        text: val,
        when: moment(),
        last_edit: moment()
      });
      this.refs.newField.getDOMNode().value = '';
    }
  },

  clearCompleted: function() {
    this.props.sparks.completed().forEach(function(spark) {
      spark.destroy();
    });
  },

  onTextChange: function (new_val) {
    this.setState({editText: new_val});
  },

  onEditClose: function(){
    this.setState({"editing": null});
  },

  onEditSave: function(){
    if (!this.state.editText) {
      this.state.editing.destroy();
    } else{
      this.state.editing.set("text", this.state.editText);
      this.state.editing.save();
    }
    this.setState({"editing": null});
  },

  onEdit: function(spark){
    this.setState({editing: spark, editText: spark.get("text")});
  },

  startNew: function(){
    var spark = this.props.sparks.create({text: "#", when: moment()});
    this.onEdit(spark);
  },

  onExpand: function(spark){
    this.setState({expanded: spark});
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
              editText={this.state.editText}
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
        <section id="sparkapp" className={classNames}>
          <header id="header">
            <h1 className="app-title">sparks*</h1>
            <form onSubmit={this.handleSubmit}>
              <input
                ref="newField"
                id="new-spark"
                placeholder="record your spark"
              />
            </form>
          </header>
          {main}
          {footer}
          {editor}
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
