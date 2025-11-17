# Data Model for Bundle Analysis

The data model exists in three stages:

1. Storage
2. Parsed data
3. Analysis

## Storage Data Model (`storage.ts`)

Each stored bundle consists of two pieces:

1. A metadata file.
2. Contents of the bundle files (including source maps).

The metadata file is stored in the database with the bundle ID `<uuid>` where `<uuid>`
is the unique ID of the bundle. It contains an `InputBundle` as JSON.

Each chunk and/or source map file that belongs to the bundle is stored
in the database with the bundle ID and `<storagePath>` as identifiers. Where possible, the `<storagePath>`
will match the original (base) filename of the chunk or source map file.

## Parsed Data Model (`parsed.ts`)

After loading the raw data, it gets converted into a structured data
model. This data model is immutable and long-lived. It will be instantiated
once when loading and then kept in memory while the bundle is loaded.

It can express the following entities:

* Bundle
* Chunk
* Chunk fragment w/ source mapping references
* Source file
* Chunk contributions per source file.

We don't want the finer analysis details at this level because we can
generate them adhoc from this data. This data should be heavily read-optimized
with some eye towards being memory efficient. We can't be too wasteful with
bidirectional links because this data will be kept in memory for the entire
session (until loading a different bundle).

## Analysis Model
