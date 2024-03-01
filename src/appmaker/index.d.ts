declare type List<T> = {
  size: number;

  add(item: T): void;

  // throws IndexOutOfBoundsException
  get(index: number): T | never;

  set(index: number, value: T): void;
  setAll(values: Array<T>): void;

  toArray(): Array<T>;
}

declare type ModelMetaStringField = {
  maxLength: number | null;
  minLength: number | null;
  required: boolean;
}

declare type ModelMetaNumberField = {
  maxValue: number | null;
  minValue: number | null;
  required: boolean;
}

declare type ModelMeta<T> = {
  fields: {
      [P in keyof T]: number extends T[P] ? ModelMetaNumberField
      : string extends T[P]
          ? ModelMetaStringField
          : ModelMetaNumberField | ModelMetaStringField
  };
}

declare type Datasource<T, Q = Record<string, unknown>, P = Record<string, unknown>> = {
  item: T | null;
  items: List<T> | null;
  draftRecord: T;

  itemIndex: number;

  loading: boolean;
  loaded: boolean;

  load(config?: { success: () => void; failure?: (e: Error) => void }): void;
  unload(): void;

  clearDraftRecord(): void;

  create(config?: { success: () => void; failure?: (e: Error) => void }): void;
  saveChanges(config?: { success: () => void; failure?: (e: Error) => void }): void;

  properties: P;
  query: {
    parameters: Q;

    sortBy: (sortDescriptors: Array<[fieldPath: string, ascending?: boolean]>) => void;
  };

  size: number;

  model: ModelMeta<T>;
};

// https://source.corp.google.com/piper///depot/google3/corp/appmaker/widget_types.ts

/** A widget which receives events upon button click. */
declare interface HasClickEvents {}

/** A widget which receives events upon value change. */
declare interface HasValueChangeEvents {}

/** A widget which receives events upon value edit. */
declare interface HasValueEditedEvents {}

/** A Widget which can be enabled or disabled. */
declare interface EnableableWidget {
  /** Whether the widget allows the user to change its value. */
  enabled: boolean;
}

/** A Widget which can have UI focus set on it. */
declare interface FocusableWidget {
  /**
   * HTML tabindex of this widget. Tab index determines which widgets will get
   * focus when the user presses tab. A negative tab index will put it at the
   * end, and the in whatever order the browser determines. Positive tab indexes
   * will be ordered lowest to highest.
   */
  tabIndex: number;
}

/** A Widget with text which can be enabled. */
declare interface TextWidget {
  /** HTML text field of this widget. */
  text: string;
}

/** A simple layout widget which contains other widgets. */
declare interface Panel<D = unknown, P = Record<string, unknown>> extends HasClickEvents, LayoutWidget<D> {
    /**
     * Create and adds all the children. Usually this happens automatically when
     * the panel is created. However, you can specify that children are created
     * when the panel is loaded or that children are only created when this method
     * is called. The latter can be useful if the panel's children's visibility is
     * controlled via scripts and you don't want the children to be created until
     * the children will be visible. If this method is called after the children
     * have been created, then it does nothing.
     */
    createChildren(): void;
  
    /** Focuses this widget. */
    focus(): void;

    properties: P;
  }

/**
 * Represents any widget that can contain other widgets inside. Layout widgets
 * are the only widgets which a data source can be set on.
 */
declare interface LayoutWidget<D = unknown> extends Widget<D> {
    /**
     * Returns a descendant widget at any depth level by name, or null if no such
     * descendant found.
     *
     * The following example returns a widget named "TextField3" from the current
     * view
     *
     *
     *  var textField = app.view.getDescendant("TextField3");
     *
     * Note: If a custom widget is a descendant of this widget, this does not
     * recursively search the descendants of that custom widget. This ensures that
     * children of a custom widget are not accidentally returned.
     */
    getDescendant(name: string): Widget | null;
  
    /**
     * Returns a JavaScript array of all descendant widgets at any depth level
     * that have given class name.
     *
     * The following example returns all widgets with the "MySelectedClass" class
     * name from the current view:
     *
     *
     *  var selectedWidgets = app.view.getDescendantsByClass("MySelectedClass");
     *  for (var i = 0; i < selectedWidgets.length; i++) {
     *    var selectedWidget = selectedWidgets[i];
     *    // Do something with the widget here...
     *  }
     */
    getDescendantsByClass(className: string): Widget[];
  
    /**
     * Returns a list of all descendant widgets at any depth level that have given
     * class name.
     * Deprecated: Use getDescendantsByClass(String) instead.
     * @deprecated This method is deprecated.
     */
    getWidgetsByClass(className: string): Widget[];
  
    /** The direct children of this Layout widget, identified by their names. */
    children: Record<string, Widget | undefined> & { _values: List<Widget> };
  
    /**
     * All the children of this Layout widget recursively, identified by their
     * names. This excludes any repeated children, such as rows in ListPanel,
     * cells in GridPanel Accordion, and their content.
     */
    descendants: Record<string, Widget | undefined> & { _values: List<Widget> };
  
    /**
     * Whether all the children have a true valid property or no valid property.
     * This can often be used in forms to determine whether all the input widgets
     * in a form have valid values.
     */
    valid: boolean;
  }  

/** Represents any widget. */
declare interface Widget<D = unknown> {
    /**
   * Gets datasource associated with this widget.
   * Deprecated: Use datasource property instead.
   * @deprecated This method is deprecated.
   */
  getDataSource(): Datasource<D>;

  /** Returns component's DOM element. */
  getElement(): HTMLElement;

  /**
   * Gets the path of this widget in the hierarchy, for example:
   * "Panel1.ListPanel2.Button3". This is useful for debugging.
   */
  getFullPath(): string;

  /**
   * For input widgets, this will validate the widget's value against widget
   * constraints, bound constraints (for example, field constraints), and the
   * widget's onValidate() event handler. Updates the widget's "valid" and
   * "validationErrors" properties. Returns true if the value meets all
   * constraints or the widget doesn't have a value to validate, false
   * otherwise.
   *
   * For layout widgets validates all children and returns true if all of them
   * are valid, false otherwise.
   *
   * If a widget changes from invalid to valid as a result of this method,
   * bindings involving the "value" property will be updated.
   */
  validate(): boolean;

  /**
   * Sets the alignment for individual widgets in a view or layout widget that
   * supports alignment. This setting overrides the default setting defined in
   * the parent widget's alignChildren field. For more information, see
   * <https://g3doc.corp.google.com/company/teams/CEDI/LCAP/appmaker/user-guide/reference/views/uiLayout.md#align-field>
   */
  align: string;

  /**
   * Text that describes the content of the widget. This property sets the
   * aria-label HTML attribute which is used by assistive technology to
   * communicate the purpose of the widget to a visually impaired user.
   */
  ariaLabel: string;

  /**
   * Value that configures if and when the widget should announce updates to
   * assistive technology such as screen readers. If this attribute is set to
   * polite, assistive technologies will notify users of updates without
   * interrupting the current task. If it is set to assertive, assistive
   * technologies will immediately notify the user, and could potentially clear
   * the speech queue of previous updates.
   */
  ariaLive: string;

  /**
   * The browser calculates the height of the widget. For example. if the
   * widget's alignment is stretch and the parent has horizontal layout, the
   * height of the widget expands to fill the flow-line's height. In particular,
   * if the parent is set to nowrap, the widget will be as tall as its parent.
   * However, if the alignment is other than stretch or if the parent has
   * vertical layout, the widget will be as tall as its content.
   */
  autoHeight: boolean;

  /**
   * The browser calculates the width of the widget. For example. if the
   * widget's alignment is stretch and the parent has vertical layout, the width
   * of the widget expands to fill the flow-line's width. In particular, if the
   * parent is set to nowrap, the widget will be as wide as its parent. However,
   * if the alignment is other than stretch or if the parent has horizontal
   * layout, the widget will be as wide as its content.
   */
  autoWidth: boolean;

  /**
   * The index of this component in its parent children. For example, if the
   * component is a row in a list panel, then the index is the row number
   * (zero-based).
   */
  childIndex: number;

  /**
   * Whether the widget is attached to the DOM and the widget's data source has
   * finished loading data.
   */
  dataLoaded: boolean;

  /**
   * The current data source of a widget. Data sources can be set on Layout
   * widgets, and are inherited by that widget's descendants. Setting a data
   * source on a widget makes it easier for that widget and its descendants to
   * access the properties of that data source.
   */
  datasource: Datasource<D>;

  /**
   * When the widget is in-flow, this property specifies the grow factor,which
   * determines how much the widget will grow relative to its siblings to fill
   * the parent in the direction of the flow. For example, if a horizontal panel
   * has two children, one with grow set 1 and another one with a grow factor of
   * 2, the first widget will grow horizontally to use one third of the empty
   * horizontal space in the panel while the second one will grow horizontally
   * consuming two thirds of that space.If the widget is not in-flow, this
   * property has no effect.
   */
  grow: number;

  /** Whether the widget has been attached to the DOM. */
  loaded: boolean;

  /**
   * The name used to refer to this widget in the editor and from scripting.
   * Note that this name cannot contain spaces and must be unique within the top
   * level view.
   */
  name: string;

  /** Parent Layout widget that contains this widget on the screen. */
  parent?: LayoutWidget;

  /**
   * Value that describes the semantic meaning of the widget. This property sets
   * the role HTML attribute which is used by assistive technology to
   * communicate the purpose of the widget to a visually impaired user.
   */
  role: string;

  /**
   * Top level Layout widget (View/View Fragment) that contains this widget in
   * its subtree. For example, if a widget belongs to a View Fragment,
   * widget.root returns that View Fragment, rather than the View which contains
   * that View Fragment.
   */
  root: LayoutWidget;

  /** Whether to display validation errors using a popup near the widget. */
  showValidationErrors: boolean;

  /**
   * The styles to apply to this view. Multiple styles can be specified in a
   * space delimited list.
   */
  styleName: string;

  /**
   * The HTML title field of this widget. On most browsers, this displays as a
   * tooltip above the widget.
   */
  title: string;

  /**
   * Whether the widget's input value (if present) and all its children (if
   * present) are valid.
   */
  valid: boolean;

  /** The validation errors associated with this widget. */
  validationErrors: List<string>;

  /**
   * Specifies a style variant for this widget. For example, a button might be a
   * "submit" button.
   */
  variant: string;

  /** True if the widget is visible, false otherwise. */
  visible: boolean;
}

/** A layout widget that displays its children in tabs. */
declare interface TabPanel<D = unknown> extends LayoutWidget<D> {
  /**
   * Gets the index of the selected tab.
   * Deprecated: Use selectedTab property instead.
   * @deprecated This method is deprecated.
   */
  getSelectedIndex(): number;

  /** Gets the title of given tab. */
  getTabTitle(index: number): string;

  /**
   * Selects tab by index.
   * Deprecated: Use selectedTab property instead.
   * @deprecated This method is deprecated.
   */
  selectTab(index: number): void;

  /**
   * Use the tabTitle property of the child panel instead. Sets the title of
   * given tab.
   * @deprecated This method is deprecated.
   */
  setTabTitle(index: number, title: string): void;

  /** The currently selected tab index. The first tab is 0. */
  selectedTab: number;

  /** The title displayed for the tab. */
  tabTitle: string;
}

/** A simple push button. */
declare interface Button<D = unknown> extends EnableableWidget, FocusableWidget,
                                        HasClickEvents, TextWidget, Widget<D> {
  /** Focuses this widget. */
  focus(): void;
}

/** A container capable of showing a collection of records. */
declare interface RecordCollection<D = unknown> extends LayoutWidget<D> {
  /** The index of the selected row. */
  selectedIndex: number;
}

/** A container capable of showing a collection of records vertically. */
declare interface VerticalRecordCollection<D = unknown> extends RecordCollection<D> {}

/**
 * A layout widget capable of showing a list of items.
 *
 * In the UI editor, the user edits a prototype row, adding widgets and
 * binding them like in a normal panel.
 *
 * During runtime, one row is shown per item in the ListPanel's data source.
 * The data source for that row is a special single item data source pointing
 * to the corresponding item in the ListPanel's datasource. This allows the
 * prototype row to access the current row's item with the @datasource.item
 * syntax.
 */
declare interface ListPanel<D = unknown> extends VerticalRecordCollection<D> {}

/** A widget which accepts user input. */
declare interface InputWidget<D = unknown> extends Widget<D> {}

/** A widget exposing a single choice. */
declare interface SingleChoiceWidget<D = unknown> extends FocusableWidget,
                                                          HasValueChangeEvents,
                                                          HasValueEditedEvents,
                                                          InputWidget<D> {
  /** Focuses this widget. */
  focus(): void;

  /**
   * Whether the user should be allowed to make no selection. The default label
   * for this option is "No Selection", you can change it by setting the
   * nullItemName property.
   */
  allowNull: boolean;

  /** Whether the widget allows the user to change its value. */
  enabled: boolean;

  /**
   * An optional list of option labels that correspond 1-1 with the option
   * values. This is useful if the value set in options and value are not
   * strings, and instead set some underlying data in the backend. For example,
   * if value and options are bound to a record, this could be used to display a
   * certain field of the record to the user.
   */
  names: List<string>;

  /**
   * Optional label to use to display the null option. Which is shown if there
   * is no selection. The default label is "No Selection". Cannot be set to null
   * or undefined.
   */
  nullItemName: string;

  /**
   * Some examples of what the options property can be bound to include:
   *     * Constant JavaScript list: ["1","2","3"].
   *     * Items of a data source. If you have a model with a field City, you
   *       can bind options to @datasource.items.City. Then if there are three
   *       records with values "L.A.", "San Francisco" and "Mountain View", the
   *       list of selectable options will contain the same values.
   *     * A field's possible values:
   *       @datasource.model.fields.FIELD_NAME.possibleValues.
   */
  options: List<unknown>;

  /**
   * Label being displayed for the selected value, or nullItemName if the
   * selected value is null or invalid.
   */
  text: string;

  /** The selected value. */
  value: unknown;
}

/**
 * Dropdown which allows user to select a single choice from a list of \
 * options. The selected value is exposed in the value property, and the
 * options to pick from are in options. The type of items in options should
 * match the type of items in value. You can specify a custom string to
 * display for each option by setting the names property.
 */
declare interface Dropdown<D = unknown> extends SingleChoiceWidget<D> {}

/** A Google Material Widget which can have UI focus set on it. */
declare interface FocusableGmWidget {
  /**
   * Indicates if the widget is focusable, or reachable using the tab key. To
   * meet GAR standards, this should be set for any actionable element, e.g.
   * when an on-click event is added to a label.
   */
  focusable: boolean;
}

/** A simple label. */
declare interface Label<D = unknown> extends FocusableGmWidget, HasClickEvents,
                                       TextWidget, Widget<D> {
  /** Focuses this widget. */
  focus(): void;
}

/** A Widget with text which can be enabled. */
declare interface EnableableTextWidget {
  /** Whether the widget allows the user to change its value. */
  enabled: boolean;

  /**
   * HTML text field of this widget.
   * Deprecated: Use value instead.
   * @deprecated This property is deprecated.
   */
  text: string;
}

/**
 * A widget which has an editable value and which can be enabled or disabled.
 */
declare interface HasEnabledValue<V> {
  /** Whether the widget allows the user to change its value. */
  enabled: boolean;

  /** The current value of this widget. Corresponds to the HTML value field. */
  value: V;
}

/** A widget which receives events upon input change. */
declare interface HasInputChangeEvents {}

/** A Widget with the HTML5 "placeholder" property. */
declare interface HasPlaceholderWidget {
  /**
   * Placeholder text to show when there is no value to show. For example,
   * "Enter full email address" for a field meant to contain an email address.
   */
  placeholder: string;
}

/** String constraints for a Widget. */
declare interface StringConstraints {
  /**
   * Defines the maximum character length of the string, including whitespace
   * (non-leading or trailing).
   */
  maxLength: number;

  /**
   * Defines the minimum allowed character length of the string, including
   * whitespace (non-leading or trailing).
   */
  minLength: number;

  /**
   * A regular expression that all valid values must match. JavaScript regular
   * expression syntax is used for this, you can read more about regular
   * expressions here
   * <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions>
   * . For example, this expression matches any US Postal code format:
   * ^d&lcub;5&rcub;(-d&lcub;4&rcub;)?$.
   */
  regularExpression: string;

  /**
   * The error message to show to the user if the regular expression does not
   * match the user input. An occurrence of '%s' in the error message is
   * replaced with the user input.
   */
  regularExpressionErrorMessage: string;

  /**
   * When enabled, indicates that input is required. Note that for string input,
   * like text fields and text areas, the empty string counts as a valid value.
   * To require a non-empty string, set minLength to 1.
   */
  required: boolean;
}

/** A simple text field widget. */
declare interface TextField<D = unknown> extends EnableableTextWidget,
                                                 FocusableWidget,
                                                 HasEnabledValue<string | null>,
                                                 HasInputChangeEvents,
                                                 HasPlaceholderWidget,
                                                 HasValueChangeEvents,
                                                 HasValueEditedEvents, InputWidget<D>,
                                                 StringConstraints {
  /** Focuses this widget. */
  focus(): void;
}

/** A checkbox component. */
declare interface CheckBox<D = unknown> extends FocusableWidget,
                                                       HasEnabledValue<boolean>,
                                                       HasValueChangeEvents,
                                                       HasValueEditedEvents, InputWidget<D>,
                                                       TextWidget {
  /** Focuses this widget. */
  focus(): void;
}

/** Multi-line text input widget. */
declare interface TextArea<D = unknown> extends EnableableTextWidget, FocusableWidget,
                                          HasEnabledValue<string>,
                                          HasInputChangeEvents,
                                          HasPlaceholderWidget,
                                          HasValueChangeEvents,
                                          HasValueEditedEvents, InputWidget<D>,
                                          StringConstraints {
  /** Focuses this widget. */
  focus(): void;

  /**
   * Controls resize direction of the component. Available options: "none",
   * "both", "horizontal", "vertical".
   */
  resize: string;
}

/**
 * A multiple select list box which allows user to select a list of items from
 * another list of \ options. The selected values are exposed in the values
 * property, and the options to pick from are in options. The type of items in
 * options should match the type of items in values. You can specify a custom
 * string to display for each option by setting the names property.
 */
declare interface MultiSelectBox<D = unknown> extends EnableableWidget,
                                                FocusableWidget, InputWidget<D> {
  /** Focuses this widget. */
  focus(): void;

  /**
   * An optional list of strings that correspond 1-1 with the options. The
   * strings will be used as labels to display the options. This is useful if
   * the values set in options and values are not strings, and instead set some
   * underlying data in the backend. For example, if value and options are bound
   * to a record, this could be used to display a certain field of the record to
   * the user.
   */
  names: List<string>;

  /**
   * Some examples of what the options property can be bound to include:
   *     * Constant JavaScript list: ["1","2","3"].
   *     * Items of a data source. If you have a model with a field City, you
   *       can bind options to @datasource.items.City. Then if there are three
   *       records with values "L.A.", "San Francisco" and "Mountain View", the
   *       list of selectable options will contain the same values.
   *     * A field's possible values:
   *       @datasource.model.fields.FIELD_NAME.possibleValues.
   */
  options: List<unknown>;

  /** The list of currently selected options. */
  values: List<unknown>;
}

/** Date constraints for a Widget. */
declare interface DateConstraints {
  /** The maximum value of the date inclusive. */
  maxValue: Date;

  /** The minimum value of the date inclusive. */
  minValue: Date;

  /** Whether a value is required or it can be missing. */
  required: boolean;
}

/** A text box that when entered pops up a date picker. */
declare interface DateTextBox <D = unknown>
  extends DateConstraints,
    FocusableWidget,
    HasEnabledValue<Date>,
    HasPlaceholderWidget,
    HasValueChangeEvents,
    HasValueEditedEvents,
    InputWidget<D> {
  /** Focuses this widget. */
  focus(): void;

  /**
   * A pattern describing how dates should be formatted in the text box. The
   * pattern used is defined by the Dart DateFormat
   * <https://pub.dev/documentation/intl/latest/intl/DateFormat-class.html>
   * class. The pattern must include the year, day, and month and nothing else.
   * Otherwise there may be inconsistencies when the date picker is used since
   * the date picker only specifies the year, month, and day.
   */
  format: string;
}

declare type User = {
  email: string;
  groups: List<string>;
  username: string;
};

declare type AppLoader = {
  suspendLoad: () => void;
  resumeLoad: () => void;
};

declare const app: {
  view: Views[keyof Views];
  views: Views;
  viewFragments: ViewFragments;
  datasources: Datasources;
  sanitizer: { sanitizeUrl(url: string): string;  };
  user: User;

  executeRemoteScript<A extends Array<unknown>, R, S extends ServerScriptNames>(scriptName: S, functionName: ServerScriptExportedNamesMap[S], args: A, callback: ((result: R) => void) | { success: (result: R) => void; failure: (err: Error) => void; }): void;

  showDialog(widget: Widget): void;
  closeDialog(): void;

  getUrlParameter(param: string): string | null;
};

declare type Views = /** generated */ unknown;

declare type ViewFragments = /** generated */ unknown;

declare type Datasources = /** generated */ unknown;

declare type ServerScriptNames = /** generated */ unknown;

declare type ServerScriptExportedNamesMap = {
  /** generated */
}
