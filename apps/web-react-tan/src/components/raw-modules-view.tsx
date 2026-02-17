import { useState } from 'react';
import {
  Search,
  Filter,
  FileCode,
  Box,
  ArrowRight,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// Mock Data for Modules
const mockModules = [
  {
    id: 'm1',
    name: 'moment.js',
    path: 'node_modules/moment/moment.js',
    size: '231 KB',
    gzip: '68 KB',
    type: 'package',
    issuers: ['src/utils/date-formatter.ts', 'src/components/calendar.tsx'],
    codeSnippet: `//! moment.js\n//! version : 2.29.4\n//! authors : Tim Wood, Iskren Chernev, Moment.js contributors\n//! license : MIT\n//! momentjs.com\n\n;(function (global, factory) {\n    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :\n    typeof define === 'function' && define.amd ? define(factory) :\n    global.moment = factory()\n}(this, (function () { 'use strict';\n\n    var hookCallback;\n\n    function hooks () {\n        return hookCallback.apply(null, arguments);\n    }\n\n    // This is done to register the method called with moment()\n    // without creating circular dependencies.\n    function setHookCallback (callback) {\n        hookCallback = callback;\n    }\n...`,
  },
  {
    id: 'm2',
    name: 'lodash.js',
    path: 'node_modules/lodash/lodash.js',
    size: '72 KB',
    gzip: '24 KB',
    type: 'package',
    issuers: ['src/utils/helpers.ts'],
    codeSnippet: `/**\n * @license\n * Lodash <https://lodash.com/>\n * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>\n * Released under MIT license <https://lodash.com/license>\n * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>\n * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors\n */\n;(function() {\n  /** Used as a safe reference for \`undefined\` in pre-ES5 environments. */\n  var undefined;\n\n  /** Used as the semantic version number. */\n  var VERSION = '4.17.21';\n...`,
  },
  {
    id: 'm3',
    name: 'button.tsx',
    path: 'src/components/ui/button.tsx',
    size: '4.2 KB',
    gzip: '1.1 KB',
    type: 'source',
    issuers: [
      'src/pages/home.tsx',
      'src/pages/dashboard.tsx',
      'src/components/layout/navbar.tsx',
    ],
    codeSnippet: `import * as React from "react"\nimport { Slot } from "@radix-ui/react-slot"\nimport { cva, type VariantProps } from "class-variance-authority"\nimport { cn } from "@/lib/utils"\n\nconst buttonVariants = cva(\n  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",\n  {\n    variants: {\n      variant: {\n        default: "bg-primary text-primary-foreground hover:bg-primary/90",\n        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",\n        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",\n        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",\n        ghost: "hover:bg-accent hover:text-accent-foreground",\n        link: "text-primary underline-offset-4 hover:underline",\n      },\n      size: {\n        default: "h-10 px-4 py-2",\n        sm: "h-9 rounded-md px-3",\n        lg: "h-11 rounded-md px-8",\n        icon: "h-10 w-10",\n      },\n    },\n    defaultVariants: {\n      variant: "default",\n      size: "default",\n    },\n  }\n)\n...`,
  },
  {
    id: 'm4',
    name: 'navbar.tsx',
    path: 'src/components/layout/navbar.tsx',
    size: '3.8 KB',
    gzip: '1.2 KB',
    type: 'source',
    issuers: ['src/pages/home.tsx', 'src/pages/dashboard.tsx'],
    codeSnippet: `import { Link } from "wouter";\nimport mascotImage from "@assets/generated_images/Flat_vector_crocodile_mascot_for_dev_tool_9d63dcf4.png";\nimport { Button } from "@/components/ui/button";\nimport { Github, BookOpen } from "lucide-react";\n\nexport function Navbar() {\n  return (\n    <nav className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">\n...`,
  },
  {
    id: 'm5',
    name: 'react-dom.production.min.js',
    path: 'node_modules/react-dom/cjs/react-dom.production.min.js',
    size: '130 KB',
    gzip: '42 KB',
    type: 'package',
    issuers: ['src/main.tsx'],
    codeSnippet: `/** @license React v18.2.0\n * react-dom.production.min.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */\n/*\n Modernizr 3.0.0pre (Custom Build) | MIT\n*/\n'use strict';var aa=require("react"),ca=require("scheduler");function p(a){for(var b="https://reactjs.org/docs/error-decoder.html?invariant="+a,c=1;c<arguments.length;c++)b+="&args[]="+encodeURIComponent(arguments[c]);return"Minified React error #"+a+"; visit "+b+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var da=new Set,ea={};function fa(a,b){ha(a,b);ha(a+"Capture",b)}function ha(a,b){ea[a]=b;for(a=0;a<b.length;a++)da.add(b[a])}var ia=!("undefined"===typeof window||"undefined"===typeof window.document||"undefined"===typeof window.document.createElement),ja=Object.prototype.hasOwnProperty,\n...`,
  },
];

export function RawModulesView() {
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<
    (typeof mockModules)[0] | null
  >(null);

  const filteredModules = mockModules.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.path.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Raw Modules</h2>
          <p className="text-muted-foreground">
            Inspect individual files, their sizes, and why they were included in
            the bundle.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search modules..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[400px]">Module Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parsed Size</TableHead>
              <TableHead>Gzip Size</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredModules.map((module) => (
              <TableRow
                key={module.id}
                className="group cursor-pointer hover:bg-muted/30"
                onClick={() => setSelectedModule(module)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'mt-1 p-1.5 rounded-md',
                        module.type === 'package'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-primary/10 text-primary',
                      )}
                    >
                      {module.type === 'package' ? (
                        <Box className="w-4 h-4" />
                      ) : (
                        <FileCode className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-mono text-sm">{module.name}</div>
                      <div
                        className="text-xs text-muted-foreground truncate max-w-[300px]"
                        title={module.path}
                      >
                        {module.path}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'font-normal',
                      module.type === 'package'
                        ? 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20'
                        : 'bg-primary/10 text-primary hover:bg-primary/20',
                    )}
                  >
                    {module.type}
                  </Badge>
                </TableCell>
                <TableCell>{module.size}</TableCell>
                <TableCell className="text-muted-foreground">
                  {module.gzip}
                </TableCell>
                <TableCell className="text-right">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Inspect <ChevronRight className="ml-1 w-4 h-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
                      <SheetHeader className="pb-6 border-b">
                        <SheetTitle className="flex items-center gap-2 font-mono text-lg text-primary">
                          {module.type === 'package' ? (
                            <Box className="w-5 h-5" />
                          ) : (
                            <FileCode className="w-5 h-5" />
                          )}
                          {module.name}
                        </SheetTitle>
                        <SheetDescription>
                          Full path:{' '}
                          <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">
                            {module.path}
                          </code>
                        </SheetDescription>
                      </SheetHeader>

                      <ScrollArea className="flex-1 -mr-6 pr-6">
                        <div className="py-6 space-y-8">
                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg border bg-card">
                              <div className="text-sm text-muted-foreground mb-1">
                                Parsed Size
                              </div>
                              <div className="text-2xl font-bold">
                                {module.size}
                              </div>
                            </div>
                            <div className="p-4 rounded-lg border bg-card">
                              <div className="text-sm text-muted-foreground mb-1">
                                Gzip Size
                              </div>
                              <div className="text-2xl font-bold text-primary">
                                {module.gzip}
                              </div>
                            </div>
                          </div>

                          {/* Issuers / Why is it here? */}
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <Layers className="w-4 h-4" />
                              Imported By (Issuers)
                            </h3>
                            <div className="rounded-lg border bg-muted/30 divide-y">
                              {module.issuers.map((issuer, i) => (
                                <div
                                  key={i}
                                  className="p-3 text-sm font-mono text-muted-foreground flex items-center gap-2"
                                >
                                  <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                                  {issuer}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Code Preview */}
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <FileCode className="w-4 h-4" />
                              Source Preview
                            </h3>
                            <div className="rounded-lg border bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
                                <span>{module.name}</span>
                                <span className="text-[10px] text-[#858585]">
                                  Read-only
                                </span>
                              </div>
                              <div className="p-4 overflow-x-auto">
                                <pre>{module.codeSnippet}</pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
