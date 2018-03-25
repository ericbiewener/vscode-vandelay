const path = require('path')

const kyoto = path.join(__dirname, 'kyoto')
const gettysburg = path.join(__dirname, 'gettysburg')
const london = path.join(__dirname, 'london')

const reduxActionsFilepathRegex = new RegExp('.*/store/.*Actions\.js$')

module.exports = {
  debug: true,
  multilineImportStyle: 'single',
  quoteType: 'double',
  maxImportLineLength: 120,
  commaDangle: true,
  importOrder: ['react', 'react-dom', 'redux', 'react-redux'],
  absolutePaths: ['kyoto'],
  shouldIncludeImport: (absImportPath, activeFilepath) => (
    !(activeFilepath.startsWith(gettysburg) && absImportPath.startsWith(london)) && // gettysburg can't improt from london
    !(activeFilepath.startsWith(london) && absImportPath.startsWith(gettysburg)) && // london can't import from gettysburg
    (!activeFilepath.startsWith(kyoto) || (!absImportPath.startsWith(gettysburg) && !absImportPath.startsWith(gettysburg))) // kyoto can only import from kyoto
  ),
  processImportPath: (importPath, absImportPath, activeFilepath, projectRoot) => {
    const kyoto = path.join(projectRoot, 'kyoto')
    if (!absImportPath.startsWith(kyoto)) return importPath
    if (activeFilepath.startsWith(kyoto)) return importPath
    return absImportPath.slice(projectRoot.length + 1)
  },
  processDefaultName: (filepath) => {
    if (!reduxActionsFilepathRegex.test(filepath)) return
    const filename = path.basename(filepath, '.js')
    return filename[0].toUpperCase() + filename.slice(1, -1)
  },
  includePaths: [
    path.join(kyoto, '**', '*.{js,jsx}'),
    path.join(gettysburg, '**', '*.{js,jsx}'),
    path.join(london, '**', '*.{js,jsx}'),
  ],
  excludePatterns: [
    /.*\.test\..*/,
    /.*\/flow-typed\/.*/,
    /.*\/config\/.*/,

    // Angular
    "**/*.spec.js",
    "**/*.component.js",
    "**/*.directive.js",
    "**/*.filter.js",
    "**/*.routes.js",
    "**/*.controller.js",
    "**/*.factory.js",
    "**/*.service.js",
  ],
  extraImports: {
    react: {
      default: 'React',
      named: ['Component'],
      types: ['ComponentType', 'Node', 'Element']
    },
    'react-dom': {
      default: 'ReactDOM'
    },
    redux: {
      named: ['combineReducers'],
      types: ['Dispatch']
    },
    'react-redux': {
      named: ['connect']
    },
    'react-router-dom': {
      named: ['withRouter', 'Link', 'Prompt'],
      types: ['ContextRouter', 'Match']
    },
    'redux-form': {
      types: ['FormProps', 'FieldProps']
    },
    'redux-form/es/reduxForm': {
      default: 'reduxForm',
    },
    'redux-form/es/SubmissionError': {
      default: 'SubmissionError',
    },
    'redux-form/es/actions': {
      default: 'ReduxFormAction',
    },
    'react-toolbox/lib/button': {
      named: ['Button', 'IconButton']
    },
    'react-toolbox/lib/card': {
      named: ['Card']
    },
    'react-toolbox/lib/chip': {
      named: ['Chip']
    },
    'react-toolbox/lib/font_icon': {
      default: 'FontIcon'
    },
    'react-toolbox/lib/checkbox': {
      default: 'Checkbox'
    },
    lodash: {
      default: '_'
    },
    'react-css-themr': {
      named: ['themr']
    },
    moment: {
      default: 'moment'
    },
    recompose: {
      named: ['compose', 'mapProps', 'withProps', 'defaultProps', 'withStateHandlers', 'withContext', 'getContext',
        'withHandlers']
    },
    classnames: {
      default: 'classnames'
    },
    reselect: {
      named: ['createSelector']
    },
    'react-media': {
      default: 'Media',
    },
    'draft-js': {
      named: ['Editor', 'EditorState', 'RichUtils', 'Modifier', 'convertToRaw', 'convertFromRaw', 'ContentBlock',
        'DraftEditorBlock', 'ContentState', 'EntityInstance', 'CharacterMetadata', 'getDefaultKeyBinding',
        'SelectionState', 'CompositeDecorator'],
    },
    'draft-js/lib/BlockMap': {
      types: ['BlockMap'],
    },
    'draft-js/lib/DraftDecoratorType': {
      types: ['DraftDecoratorType'],
    },
    'draft-js/lib/EditorChangeType': {
      types: ['EditorChangeType'],
    },
    'draft-js/lib/DraftInlineStyle': {
      types: ['DraftInlineStyle'],
    },
    'draft-js/lib/RawDraftContentState': {
      types: ['RawDraftContentState'],
    },
    'immutable': {
      default: "Immutable",
    },
    'material-ui/Table': {
      default: 'Table',
      named: ['TableBody', 'TableCell', 'TableFooter', 'TableHead', 'TablePagination', 'TableRow'],
    },
    'material-ui/Button': {
      default: 'Button',
    },
    'material-ui/Icon': {
      default: 'Icon',
    },
    'material-ui/IconButton': {
      default: 'IconButton',
    },
    'material-ui/Menu': {
      default: 'Menu',
      named: ['MenuItem'],
    },
    'material-ui/Select': {
      deafult: 'Select',
    },
    'material-ui/Dialog': {
      default: 'Dialog',
      named: ['DialogTitle', 'DialogActions', 'DialogContent']
    },
    'material-ui/Grid': {
      default: 'Grid',
    },
    'material-ui/Typography': {
      default: 'Typography'
    },
    'material-ui/Divider': {
      default: 'Divider'
    },
    'material-ui/TextField': {
      default: 'TextInput',
    },
    'material-ui/Paper': {
      default: 'Paper',
    },
    'material-ui/transitions/Grow': {
      default: 'Grow',
    },
    'material-ui/styles': {
      named: ['withStyles'],
    },
    'material-ui/List': {
      default: 'List',
      named: ['ListItem', 'ListItemText'],
    },
    'material-ui/Tabs': {
      default: 'Tabs',
      named: ['Tab'],
    },
    'material-ui/Card': {
      default: 'Card',
      named: ['CardContent'],
    },
    'material-ui/Progress': {
      named: ['CircularProgress']
    },
    'material-ui/Checkbox': {
      default: 'Checkbox',
    },
    'material-ui/Chip': {
      default: 'Chip',
    },
    'material-ui/Form': {
      named: ['FormLabel', 'FormControl', 'FormControlLabel', 'FormHelperText'],
    },
    'material-ui/Radio': {
      default: 'Radio',
      named: ['RadioGroup']
    },
    'react-beautiful-dnd': {
      named: ['DragDropContext', 'Droppable', 'Draggable'],
      types: ['DroppableProvided', 'DroppableStateSnapshot', 'DraggableProvided', 'DraggableStateSnapshot', 'DropResult'],
    },
    'formik': {
      named: ['Formik', 'FastField', 'Form'],
      types: ['FormikProps', 'FieldProps', 'FormikState']
    },
    'enzyme': {
      named: ['shallow', 'mount']
    }
  }
}
