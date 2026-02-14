// src/DB/db.service.js

export const create = async ({ model, data = {} }) => {
  return await model.create(data)
}

export const findOne = async ({ model, filter = {}, populate = [], select = "" } = {}) => {
  return await model.findOne(filter).populate(populate).select(select)
}

export const find = async ({ model, filter = {}, options = {} } = {}) => {
  const doc = model.find(filter)

  if (options.populate) {
    doc.populate(options.populate)
  }

  if (options.skip) {
    doc.skip(options.skip)
  }

  if (options.limit) {
    doc.limit(options.limit)
  }

  return await doc.exec()
}

export const updateOne = async ({model,filter = {},update = {},options = {}} = {}) => {
  const doc = model.updateOne(
    filter,
    update,
    { runValidators: true, ...options }
  )

  return await doc.exec()
}

export const findOneAndUpdate = async ({model,filter = {},update = {},options = {}} = {}) => {
  const doc = model.findOneAndUpdate(
    filter,
    update,
    { new: true, runValidators: true, ...options }
  )

  return await doc.exec()
}

export const deleteOne = async ({ model, filter = {} } = {}) => {
  const doc = model.deleteOne(filter)
  return await doc.exec()
}
