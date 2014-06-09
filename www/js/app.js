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

var SparkItem = React.createClass({
  handleSubmit: function(event) {
    var val = this.refs.editField.getDOMNode().value.trim();
    if (val) {
      this.props.spark.set({text: val, last_edit: moment()});
      this.props.spark.save();
      this.setState({"editing": false});
    } else {
      this.props.onDestroy();
    }
    return false;
  },
  getInitialState: function() {
    return {expanded: false, editing: false, curText: this.props.spark.get('text')};
  },

  expand: function() {
    this.setState({"expanded": !this.state.expanded});
  },

  edit: function() {
    this.setState({"editing": true});
    this.refs.editField.getDOMNode().focus();
  },

  cancel: function() {
    this.setState({"editing": false});
    return false;
  },

  save: function(spark, text) {
    spark.set('text', text);
    this.setState({editing: null});
  },

  handleChange: function(event){
    this.setState({curText: event.target.value});
  },

  render: function() {
    var classes = Utils.stringifyObjKeys({
      expanded: this.state.expanded, editing: this.state.editing
    });
    return (
      <li className={classes}>
        <div className="view">
          <span className="when">{moment(this.props.spark.get("when")).fromNow()}</span>
          <div className="spark" onClick={this.expand} dangerouslySetInnerHTML={{
            __html: markdown.toHTML(this.props.spark.get('text'))
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
        <form onSubmit={this.handleSubmit}>
          <div>
            <textarea
              ref="editField"
              className="edit"
              defaultValue={this.state.curText}
              onChange={this.handleChange}
              autoFocus="autofocus" />
            <pre ref="editClone" className='expanding-clone'>{this.state.curText}<br/></pre>
          </div>
          <div className="actions">
            <button className="edit-action" onClick={this.handleSubmit}>
              <span className="fa fa-2x fa-check"></span>
            </button>
            <button className="edit-action" onClick={this.cancel}>
              <span className="fa fa-2x fa-times"></span>
            </button>
          </div>
        </form>
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
    return {editing: null, expanded: false};
  },

  componentDidMount: function() {
    this.props.sparks.fetch();
    this.refs.newField.getDOMNode().focus();
  },

  componentDidUpdate: function() {
    // If saving were expensive we'd listen for mutation events on Backbone and
    // do this manually. however, since saving isn't expensive this is an
    // elegant way to keep it reactively up-to-date.
    this.props.spark.forEach(function(spark) {
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

  render: function() {
    var main = null,
        footer = null,
        sparkItems = this.props.sparks.map(function(spark) {
          return (
            <SparkItem
              key={spark.id}
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

    return (
      <div>
        <section id="sparkapp">
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
        </section>
        <footer id="info">
          <p>Double-click to edit a spark</p>
          <p>
            Created by{' '}
            <a href="http://github.com/svnlto/">svnlto</a>
            based on the work of
            <a href="http://github.com/petehunt/">petehunt</a>
          </p>
          <p>Part of{' '}<a href="http://sparkmvc.com">sparkMVC</a></p>
        </footer>
      </div>
    );
  }
});

React.renderComponent(
  <SparkApp sparks={new SparkList()} />, document.getElementById('container')
);
