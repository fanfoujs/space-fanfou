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
	other_files \
	compress_scripts \
	compress_styles \

build_dir:
	mkdir -p build

compress_scripts: $(SCRIPTS_DEST)
$(SCRIPTS_DEST): build/%: src/%
	uglifyjs -nc -o $@ $<

compress_styles: $(STYLES_DEST)
$(STYLES_DEST): build/%: src/%
	uglifycss $< >$@

other_files: $(OTHERS_DEST)
$(OTHERS_DEST): build/%: src/%
	@if [ -d $< ]; \
		then \
		mkdir -p $@; \
		echo "mkdir -p $@"; \
	else \
		cp $< $@; \
		echo "cp $< $@"; \
	fi

.PHONY: clean
clean:
	-rm -rf build
