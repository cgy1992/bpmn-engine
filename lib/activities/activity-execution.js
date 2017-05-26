'use strict';

const parameter = require('../parameter');
const Form = require('./Form');

module.exports = function execution(activity, message, variablesAndServices) {
  const activityId = activity.id;
  const type = activity.type;

  let id = activityId;
  if (message && message.loop && !message.isSequential) {
    id = `${activityId}_${generateId()}`;
  }

  const io = activity.parentContext.getActivityInputOutput(activity.activity) || {};

  const inputParameters = io.inputParameters && io.inputParameters.map(parameter);
  const outputParameters = io.outputParameters && io.outputParameters.map(parameter);

  let resultData;
  let inputResult;

  const executionContext = {
    id: id,
    type: activity.type,
    activity: activity,
    cancel: cancel,
    getState: getState,
    getInput: getInput,
    postpone: postpone,
    setResult: setResult,
    hasOutputParameters: !!outputParameters,
    getOutput: getOutput,
    getActivityApi: getActivityApi
  };

  function getInput() {
    if (inputResult) return inputResult;
    if (!inputParameters) {
      return Object.assign({}, message, variablesAndServices);
    }

    inputResult = {};
    inputParameters.forEach((parm) => {
      inputResult[parm.name] = parm.getInputValue(message, variablesAndServices);
    });

    return inputResult;
  }

  function setResult(data) {
    resultData = data;
  }

  function getOutput() {
    if (!outputParameters) {
      return resultData;
    }

    const result = {};
    const variablesAndServicesWithInput = Object.assign({}, variablesAndServices, getInput());

    outputParameters.forEach((parm) => {
      result[parm.name] = parm.getOutputValue(resultData, variablesAndServicesWithInput);
    });

    return result;
  }

  function postpone(executeCallback) {
    const activityApi = getActivityApi({
      waiting: true
    });

    if (activity.form) {
      activityApi.form = getForm();
    }

    activityApi.signal = function(input) {
      executeCallback(null, input);
    };
    activityApi.complete = function(output) {
      executeCallback(null, output);
    };

    return activityApi;
  }

  function getState() {
    return activity.getState();
  }

  function cancel() {
    activity.cancel();
  }

  function getForm() {
    const form = new Form(activity.form.formData);
    form.init(getInput(), variablesAndServices);
    return form;
  }

  function getActivityApi(override) {
    return Object.assign({
      id: id,
      type: type,
      activity: activity,
      cancel: cancel,
      getInput: getInput,
      getState: getState,
      getOutput: getOutput
    }, override);
  }

  return executionContext;
};

function generateId() {
  const min = 11000;
  const max = 999999;
  const rand = Math.floor(Math.random() * (max - min)) + min;

  return rand.toString(16);
}