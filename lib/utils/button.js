/**
 * Builder library for WhatsApp interactive messages
 * and AI rich response payloads using Baileys.
 *
 * Created By Nixel
 * wa.me/6282139672290
 *
 * VERSION: 3.1
 */

import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
} from "@whiskeysockets/baileys";
import botConfig from "../../config/bot.config.js";

import crypto from "crypto";

/**
 * Class representing a Button for interactive WhatsApp messages.
 */
export class Button {
  constructor() {
    /** @private {string} Title of the message header */
    this._title = "";
    /** @private {string} Subtitle of the message header */
    this._subtitle = "";
    /** @private {string} Body text of the message */
    this._body = "";
    /** @private {string} Footer text of the message */
    this._footer = "";
    /** @private {Array} Array to hold button objects (new method) */
    this._beton = [];
    /** @private {*} Data object for media (image, video, document, etc.) */
    this._data;
    /** @private {Object} Context info object for message metadata */
    this._contextInfo = {};
    /** @private {number} Index of the current selection */
    this._currentSelectionIndex = -1;
    /** @private {number} Index of the current section */
    this._currentSectionIndex = -1;
    /** @private {number} Type of message; 0 for interactive, other for alternative format */
    this._type = 0;
    /** @private {Array} Array to hold old button objects (V2) */
    this._betonOld = [];
    /** @private {Array} Array to hold messageParamsJson */
    this._params = {};
  }

  /**
   * Set video media for the message.
   * @param {string|Buffer} path - URL or Buffer of the video.
   * @param {object} [options={}] - Additional options for the video media.
   * @returns {Button|Error} Returns the Button instance or an Error if path is missing.
   */
  setVideo(path, options = {}) {
    if (!path) return new Error("Url or buffer needed");
    Buffer.isBuffer(path)
      ? (this._data = { video: path, ...options })
      : (this._data = { video: { url: path }, ...options });
    return this;
  }

  /**
   * Set image media for the message.
   * @param {string|Buffer} path - URL or Buffer of the image.
   * @param {object} [options={}] - Additional options for the image media.
   * @returns {Button|Error} Returns the Button instance or an Error if path is missing.
   */
  setImage(path, options = {}) {
    if (!path) return new Error("Url or buffer needed");
    if (Buffer.isBuffer(path)) {
      this._data = { image: path, ...options };
    } else {
      this._data = { image: { url: path }, ...options };
    }
    return this;
  }

  /**
   * Set document media for the message.
   * @param {string|Buffer} path - URL or Buffer of the document.
   * @param {object} [options={}] - Additional options for the document media.
   * @returns {Button|Error} Returns the Button instance or an Error if path is missing.
   */
  setDocument(path, options = {}) {
    if (!path) return new Error("Url or buffer needed");
    Buffer.isBuffer(path)
      ? (this._data = { document: path, ...options })
      : (this._data = { document: { url: path }, ...options });
    return this;
  }

  /**
   * Set custom media for the message.
   * @param {Object} obj - An object representing the media.
   * @returns {Button|string} Returns the Button instance or an error message if the type is incorrect.
   */
  setMedia(obj) {
    if (typeof obj === "object" && !Array.isArray(obj)) {
      this._data = obj;
    } else {
      return `Type of media must be an Object`;
    }
    return this;
  }

  /**
   * Set the title for the message header.
   * @param {string} title - The title text.
   * @returns {Button} Returns the Button instance.
   */
  setTitle(title) {
    this._title = title;
    return this;
  }

  /**
   * Set the subtitle for the message header.
   * @param {string} subtitle - The subtitle text.
   * @returns {Button} Returns the Button instance.
   */
  setSubtitle(subtitle) {
    this._subtitle = subtitle;
    return this;
  }

  /**
   * Set the body text of the message.
   * @param {string} body - The main content of the message.
   * @returns {Button} Returns the Button instance.
   */
  setBody(body) {
    this._body = body;
    return this;
  }

  /**
   * Set the footer text of the message.
   * @param {string} footer - The footer text.
   * @returns {Button} Returns the Button instance.
   */
  setFooter(footer) {
    this._footer = footer;
    return this;
  }

  /**
   * Set context information for the message.
   * @param {Object} obj - An object representing context info.
   * @returns {Button|string} Returns the Button instance or an error message if the type is incorrect.
   */
  setContextInfo(obj) {
    if (typeof obj === "object" && !Array.isArray(obj)) {
      this._contextInfo = obj;
    } else {
      return `Type of contextInfo must be an Object`;
    }
    return this;
  }

  /**
   * Set params information for the message.
   * @param {Object} obj - An object representing context info.
   * @returns {Button|string} Returns the Button instance or an error message if the type is incorrect.
   */
  setParams(obj) {
    if (typeof obj === "object" && !Array.isArray(obj)) {
      this._params = obj;
    } else {
      return `Type of params must be an Object`;
    }
    return this;
  }

  /**
   * Set a property of the Button instance.
   * @param {string} name - The property name.
   * @param {*} value - The value to assign.
   * @returns {Button|string} Returns the Button instance or an error message if the property is not found.
   */
  setVariable(name, value) {
    if (!this.hasOwnProperty(name))
      return `Cannot find variable ${name}, try getVariableList()`;
    this[name] = value;
    return this;
  }

  /**
   * Get the value of a variable/property from the Button instance.
   * @param {string} name - The property name.
   * @returns {*} Returns the value of the property or an error message if not found.
   */
  getVariable(name) {
    if (!this.hasOwnProperty(name))
      return `Cannot find variable ${name}, try getVariableList()`;
    return this[name];
  }

  /**
   * Get a list of all variable/property names of the Button instance.
   * @returns {Array<string>} Returns an array of property names.
   */
  getVariableList() {
    return Object.keys(this);
  }

  /**
   * Add a button to the message.
   * @param {string} name - The name/type of the button.
   * @param {object} params - The parameters for the button in JSON format.
   * @returns {Button} Returns the Button instance.
   */
  setButton(name, params) {
    this._beton.push({ name, buttonParamsJson: JSON.stringify(params) });
    return this;
  }

  /**
   * Add a button using the V2 method.
   * @param {object} params - The parameters for the button.
   * @returns {Button} Returns the Button instance.
   */
  setButtonV2(params) {
    this._betonOld.push(params);
    return this;
  }

  /**
   * Create a row in a button section.
   * @param {string} [header=""] - The header text for the row.
   * @param {string} [title=""] - The title text for the row.
   * @param {string} [description=""] - The description text for the row.
   * @param {string} [id=""] - The identifier for the row.
   * @throws Will throw an error if selection or section has not been created.
   * @returns {Button} Returns the Button instance.
   */
  makeRow(header = "", title = "", description = "", id = "") {
    if (
      this._currentSelectionIndex === -1 ||
      this._currentSectionIndex === -1
    ) {
      throw new Error("You need to create a selection and a section first");
    }
    const buttonParams = JSON.parse(
      this._beton[this._currentSelectionIndex].buttonParamsJson,
    );
    buttonParams.sections[this._currentSectionIndex].rows.push({
      header,
      title,
      description,
      id,
    });
    this._beton[this._currentSelectionIndex].buttonParamsJson =
      JSON.stringify(buttonParams);
    return this;
  }

  /**
   * Create a new section in the current selection.
   * @param {string} [title=""] - The title of the section.
   * @param {string} [highlight_label=""] - The highlight label for the section.
   * @throws Will throw an error if no selection exists.
   * @returns {Button} Returns the Button instance.
   */
  makeSections(title = "", highlight_label = "") {
    if (this._currentSelectionIndex === -1) {
      throw new Error("You need to create a selection first");
    }
    const buttonParams = JSON.parse(
      this._beton[this._currentSelectionIndex].buttonParamsJson,
    );
    buttonParams.sections.push({ title, highlight_label, rows: [] });
    this._currentSectionIndex = buttonParams.sections.length - 1;
    this._beton[this._currentSelectionIndex].buttonParamsJson =
      JSON.stringify(buttonParams);
    return this;
  }

  /**
   * Add a new selection for buttons.
   * @param {string} title - The title of the selection.
   * @returns {Button} Returns the Button instance.
   */
  addSelection(title) {
    this._beton.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({ title, sections: [] }),
    });
    this._currentSelectionIndex = this._beton.length - 1;
    this._currentSectionIndex = -1;
    return this;
  }

  /**
   * Add a quick reply button.
   * @param {string} [display_text=""] - The text displayed on the button.
   * @param {string} [id=""] - The identifier for the button.
   * @returns {Button} Returns the Button instance.
   */
  addReply(display_text = "", id = "") {
    this._beton.push({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({ display_text, id }),
    });
    return this;
  }

  /**
   * Add a quick reply button using V2 method.
   * @param {string} [displayText=""] - The text to display on the button.
   * @param {string} [buttonId=""] - The button ID.
   * @returns {Button} Returns the Button instance.
   */
  addReplyV2(displayText = "", buttonId = "") {
    if (!displayText) displayText = "Button";
    if (!buttonId) buttonId = crypto.randomBytes(8).toString("hex");
    this._betonOld.push({ buttonId, buttonText: { displayText }, type: 1 });
    this._type = 1;
    return this;
  }

  /**
   * Add a call-to-action button for calling.
   * @param {string} [displayText=""] - The text to display on the button.
   * @param {string} [id=""] - The identifier for the button.
   * @returns {Button} Returns the Button instance.
   */
  addCall(displayText = "", id = "") {
    this._beton.push({
      name: "cta_call",
      buttonParamsJson: JSON.stringify({
        display_text: displayText,
        id,
      }),
    });
    return this;
  }

  /**
   * Add a reminder call-to-action button.
   * @param {string} [displayText=""] - The text to display on the button.
   * @param {string} [id=""] - The identifier for the button.
   * @returns {Button} Returns the Button instance.
   */
  addReminder(displayText = "", id = "") {
    this._beton.push({
      name: "cta_reminder",
      buttonParamsJson: JSON.stringify({
        display_text: displayText,
        id,
      }),
    });
    return this;
  }

  /**
   * Add a cancel reminder call-to-action button.
   * @param {string} [displayText=""] - The text to display on the button.
   * @param {string} [id=""] - The identifier for the button.
   * @returns {Button} Returns the Button instance.
   */
  addCancelReminder(displayText = "", id = "") {
    this._beton.push({
      name: "cta_cancel_reminder",
      buttonParamsJson: JSON.stringify({
        display_text: displayText,
        id,
      }),
    });
    return this;
  }

  /**
   * Add an address button.
   * @param {string} [displayText=""] - The text to display on the button.
   * @param {string} [id=""] - The identifier for the button.
   * @returns {Button} Returns the Button instance.
   */
  addAddress(displayText = "", id = "") {
    this._beton.push({
      name: "address_message",
      buttonParamsJson: JSON.stringify({
        display_text: displayText,
        id,
      }),
    });
    return this;
  }

  /**
   * Add a button for sending location.
   * @returns {Button} Returns the Button instance.
   */
  addLocation() {
    this._beton.push({
      name: "send_location",
      buttonParamsJson: "",
    });
    return this;
  }

  /**
   * Add a URL button.
   * @param {string} [displayText=""] - The text to display on the button.
   * @param {string} [url=""] - The URL to open when the button is clicked.
   * @param {boolean} [webviewInteraction=false] - Whether to open in webview.
   * @returns {Button} Returns the Button instance.
   */
  addUrl(displayText = "", url = "", webviewInteraction = false) {
    this._beton.push({
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: displayText,
        url,
        webview_interaction: webviewInteraction,
      }),
    });
    return this;
  }

  /**
   * Add a copy button that copies text when clicked.
   * @param {string} [displayText=""] - The text to display on the button.
   * @param {string} [copyCode=""] - The text/code to copy.
   * @param {string} [id=""] - The identifier for the button.
   * @returns {Button} Returns the Button instance.
   */
  addCopy(displayText = "", copyCode = "", id = "") {
    this._beton.push({
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({
        display_text: displayText,
        copy_code: copyCode,
        id,
      }),
    });
    return this;
  }

  /**
   * display params list
   * @retuns {object} Returns a params object.
   */
  paramsList() {
    return {
      limited_time_offer: {
        text: "string",
        url: "string",
        copy_code: "string",
        expiration_time: "number",
      },
      bottom_sheet: {
        in_thread_buttons_limit: "number",
        divider_indices: ["number"],
        list_title: "string",
        button_title: "string",
      },
      tap_target_configuration: {
        title: "string",
        description: "string",
        canonical_url: "string",
        domain: "string",
        buttonIndex: "number",
      },
    };
  }

  /**
   * Send the interactive message with buttons.
   *
   * If _type is 0, sends as an interactive message with new button format.
   * Otherwise, sends using the old button format.
   *
   * Bypass mode:
   * - When enabled via options.bypass = true
   * - Forces WhatsApp to render button UI even on patched clients
   * - Works by injecting a dummy locationMessage + headerType: 6
   * - This tricks WhatsApp UI into treating the message as a supported interactive payload
   *
   * @param {string} jid - The target chat ID.
   * @param {object} conn - The WhatsApp connection object.
   * @param {object} quoted - The quoted message (if any).
   * @returns {Promise<object>} Returns a promise that resolves to the sent message object.
   */
  async run(jid, conn, quoted = "", { bypass = false, ...options } = {}) {
    if (this._type === 0) {
      const message = {
        body: {
          text: this._body,
        },
        footer: {
          text: this._footer,
        },
        header: {
          title: this._title,
          subtitle: this._subtitle,
          hasMediaAttachment: !!this._data,
          ...(this._data
            ? await prepareWAMessageMedia(this._data, {
                upload: conn.waUploadToServer,
              })
            : {}),
        },
      };

      const msg = generateWAMessageFromContent(
        jid,
        {
          interactiveMessage: {
            ...message,
            contextInfo: this._contextInfo,
            nativeFlowMessage: {
              messageParamsJson: JSON.stringify(this._params),
              buttons: this._beton,
            },
          },
        },
        { quoted },
      );

      await conn.relayMessage(msg.key.remoteJid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [
          {
            tag: "biz",
            attrs: {},
            content: [
              {
                tag: "interactive",
                attrs: { type: "native_flow", v: "1" },
                content: [
                  { tag: "native_flow", attrs: { v: "9", name: "mixed" } },
                ],
              },
            ],
          },
        ],
        ...options,
      });
      return msg;
    } else {
      const msg = generateWAMessageFromContent(
        jid,
        {
          buttonsMessage: {
            ...(this._data ? this._data : {}),
            [this._data ? "caption" : "contentText"]: this._body,
            title: !!this._data ? null : this._title,
            footerText: this._footer,
            ...(bypass
              ? {
                  headerType: 6,
                  locationMessage: {},
                }
              : {}),
            viewOnce: true,
            contextInfo: this._contextInfo,
            buttons: [
              ...this._betonOld,
              ...this._beton.map((nixel) => ({
                buttonId: "Nixel",
                buttonText: {
                  displayText: "Nixel",
                },
                type: 1,
                nativeFlowInfo: {
                  name: nixel.name,
                  paramsJson: nixel.buttonParamsJson,
                },
              })),
            ],
          },
        },
        { quoted, ...options },
      );

      await conn.relayMessage(msg.key.remoteJid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [
          {
            tag: "biz",
            attrs: {},
            content: [
              {
                tag: "interactive",
                attrs: { type: "native_flow", v: "1" },
                content: [
                  { tag: "native_flow", attrs: { v: "9", name: "mixed" } },
                ],
              },
            ],
          },
        ],
        ...options,
      });
      return msg;
    }
  }
}

/**
 * Class for constructing rich AI response payloads (multi-format: text, code, table, media).
 * @class
 */
class AIRich {
  /**
   * Initialize AIRich instance.
   */
  constructor() {
    /** @private @type {Array<Object>} Internal submessage payloads */
    this._submessages = [];

    /** @private @type {Array<Object>} Unified response sections */
    this._sections = [];

    /** @private @type {Array<Object>} Sources metadata for rich responses */
    this._richResponseSources = [];
  }

  /**
   * Add plain text content.
   * @param {string} text - Text content.
   * @returns {AIRich}
   */
  addText(text) {
    this._submessages.push({
      messageType: 2,
      messageText: text,
    });

    this._sections.push({
      view_model: {
        primitive: {
          text,
          __typename: "GenAIMarkdownTextUXPrimitive",
        },
        __typename: "GenAISingleLayoutViewModel",
      },
    });

    return this;
  }

  /**
   * Add syntax-highlighted code block.
   * @param {string} language - Programming language.
   * @param {string} code - Code string.
   * @returns {AIRich}
   */
  addCode(language, code) {
    const meta = this.tokenizer(code, language);

    this._submessages.push({
      messageType: 5,
      codeMetadata: {
        codeLanguage: language,
        codeBlocks: meta.codeBlock,
      },
    });

    this._sections.push({
      view_model: {
        primitive: {
          language,
          code_blocks: meta.unified_codeBlock,
          __typename: "GenAICodeUXPrimitive",
        },
        __typename: "GenAISingleLayoutViewModel",
      },
    });
  }
}
