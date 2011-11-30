UGLIFYJS=uglifyjs
BUILD_DIR=build

SCRIPTS:=$(wildcard src/*.js) $(wildcard src/*/*.js)
SCRIPTS_DEST:=$(patsubst src/%,build/%,$(SCRIPTS))

STYLES:=$(wildcard src/*.css) $(wildcard src/*/*.css)
STYLES_DEST:=$(patsubst src/%,build/%,$(STYLES))

OTHERS:=$(wildcard src/*) $(wildcard src/*/*)
OTHERS:=$(filter-out %.js %.css,$(OTHERS))
OTHERS_DEST:=$(patsubst src/%,build/%,$(OTHERS))

all: build_dir \
	compress_scripts \
	compress_styles \
	other_files

build_dir:
	mkdir -p $(BUILD_DIR)/common
	mkdir -p $(BUILD_DIR)/plugins
	mkdir -p $(BUILD_DIR)/icons

compress_scripts: $(SCRIPTS_DEST)
$(SCRIPTS_DEST): build/%: src/%
	uglifyjs -nc -o $@ $<

compress_styles: $(STYLES_DEST)
$(STYLES_DEST): build/%: src/%
	uglifycss $< >$@

other_files: $(OTHERS_DEST)
$(OTHERS_DEST): build/%: src/%
	cp $< $@

.PHONY: clean
clean:
	-rm -rf build
