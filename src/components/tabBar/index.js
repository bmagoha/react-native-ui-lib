import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import {StyleSheet, ViewPropTypes, Animated, ScrollView} from 'react-native';
import {Colors, Spacings} from '../../style';
import {BaseComponent} from '../../commons';
import View from '../view';
import Image from '../image';
import Assets from '../../assets';
import TabBarItem from './TabBarItem';


const LAYOUT_MODES = {
  FIT: 'FIT',
  SCROLL: 'SCROLL',
};

/**
 * @description: Basic TabBar component
 * @gif: https://media.giphy.com/media/3o751YHFZVlv3Ay4k8/giphy.gif
 * @example: https://github.com/wix/react-native-ui-lib/blob/master/demo/src/screens/componentScreens/TabBarScreen.js
 */
export default class TabBar extends BaseComponent {
  static displayName = 'TabBar';
  static propTypes = {
    ...ViewPropTypes.height,
    /**
     * current selected tab index
     */
    selectedIndex: PropTypes.number,
    /**
     * custom style for the tab bar
     */
    style: ViewPropTypes.style,
    /**
     * custom style for the selected indicator
     */
    indicatorStyle: ViewPropTypes.style,
    /**
     * whethere the indicator should mark item's content instead of the whole item's width
     */
    isContentIndicator: PropTypes.bool,
    /**
     * whethere the indicator should mark the last tab or not (onTabSelected will return tab's index when selected)
     */
    ignoreLastTab: PropTypes.bool,
    /**
     * disable the animated transition of the tab indicator
     */
    disableAnimatedTransition: PropTypes.bool,
    /**
     * callback for when index has change (will not be called on last tab when passing ignoreLastTab)
     */
    onChangeIndex: PropTypes.func,
    /**
     * callback for when tab selected
     */
    onTabSelected: PropTypes.func,
    /**
     * FIT to force the content to fit to screen, or SCROLL to allow content overflow
     */
    mode: PropTypes.oneOf(Object.keys(LAYOUT_MODES)),
    /**
     * Add gradiant effect for scroll overflow. IMPORTANT: must have a native module available!
     */
    useGradientFinish: PropTypes.bool,
  };

  static defaultProps = {
    mode: LAYOUT_MODES.FIT,
    selectedIndex: 0,
    height: 51,
  };

  static modes = LAYOUT_MODES;

  constructor(props) {
    super(props);

    this.itemsWidths = {};
    this.contentWidth = undefined;
    this.containerWidth = undefined;
    this.childrenCount = React.Children.count(this.props.children);
    this.itemContentSpacing = this.getThemeProps().isContentIndicator ? Spacings.s4 : 0;

    this.state = {
      selectedIndex: props.selectedIndex,
      selectedIndicatorPosition: new Animated.Value(0),
      gradientValue: new Animated.Value(1),
      fadeAnim: 0,
      currentMode: props.mode,
    };

    this.checkPropsMatch();
  }

  checkPropsMatch() {
    const {ignoreLastTab} = this.getThemeProps();
    const {selectedIndex} = this.state;
    
    if (ignoreLastTab && selectedIndex === this.childrenCount - 1) {
      console.warn('Your selectedIndex is the last tab. Please change it or remove the ignoreLastTab prop');
    }
  }

  generateStyles() {
    this.styles = createStyles(this.getThemeProps());
  }

  /** Indicator */

  hasMeasurements() {    
    return (_.keys(this.itemsWidths).length === this.childrenCount);
  }

  updateIndicatorPosition = () => {    
    if (this.hasMeasurements() && this.contentWidth) {
      this.setState({selectedIndicatorPosition: new Animated.Value(this.calcIndicatorPosition(this.state.selectedIndex))});
    }
  }

  calcIndicatorWidth() {    
    if (this.childrenCount === 0) {
      return '0%';
    }
    const itemWidth = this.itemsWidths[this.state.selectedIndex] - (this.itemContentSpacing * 2);
    const width = (itemWidth / this.contentWidth) * 100;
    return `${width}%`;
  }

  calcIndicatorPosition(index) {
    let position = 0;
    if (!_.isEmpty(this.itemsWidths)) {
      let itemPosition = 0;
      for (let i = 0; i < index; i++) {
        itemPosition += this.itemsWidths[i];
      }
      itemPosition += this.itemContentSpacing;
      position = (itemPosition / this.contentWidth) * 100;
    } else {
      position = (index * (100 / this.childrenCount)) + this.itemContentSpacing;
    }
    return position;
  }

  animateIndicatorPosition = (index) => {
    const {disableAnimatedTransition} = this.getThemeProps();
    const {selectedIndicatorPosition} = this.state;

    const newPosition = this.calcIndicatorPosition(index);

    if (disableAnimatedTransition) {
      selectedIndicatorPosition.setValue(newPosition);
    } else {
      Animated.spring(selectedIndicatorPosition, {
        toValue: newPosition,
        tension: 30,
        friction: 8,
      }).start();
    }
  }

  onChangeIndex(index) {
    const {ignoreLastTab} = this.getThemeProps();
    if (ignoreLastTab && index === this.childrenCount - 1) {
      // ignoring the last tab selection
    } else {
      this.animateIndicatorPosition(index);
      this.setState({selectedIndex: index});
      _.invoke(this.props, 'onChangeIndex', index);
    }
  }

  onTabSelected(index) {    
    _.invoke(this.props, 'onTabSelected', index);
  }

  /** Renders */

  renderChildren() {
    const {selectedIndex} = this.state;
    const children = React.Children.map(this.props.children, (child, index) => {    
      return React.cloneElement(child, {
        selected: selectedIndex === index,
        width: this.itemsWidths[index], // HACK: keep initial item's width for indicator's width
        onPress: () => {
          this.onChangeIndex(index);
          this.onTabSelected(index);
          _.invoke(child.props, 'onPress');
        },
        onLayout: (event) => {
          if (_.isUndefined(this.itemsWidths[index])) {
            const {width} = event.nativeEvent.layout;
            this.itemsWidths[index] = width;

            this.updateIndicatorPosition();
          }
        },
      });
    });
    return children;
  }

  renderSelectedIndicator() {
    const {indicatorStyle} = this.getThemeProps();
    const {selectedIndicatorPosition} = this.state;
    
    // if only one tab - don't render indicator at all
    if (this.childrenCount - 1 === 0) { return; }
    
    const width = this.calcIndicatorWidth();
    const left = selectedIndicatorPosition.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });
    return (
      <Animated.View
        style={[this.styles.selectedIndicator, this.styles.absoluteContainer, {left, width}, indicatorStyle]}
      />
    );
  }

  renderBar() {
    const {height, style} = this.getThemeProps();
    return (
      <View style={[this.styles.container, style]} bg-white row height={height} onLayout={this.onLayout} useSafeArea>
        {this.renderChildren()}
        {this.hasMeasurements() && this.renderSelectedIndicator()}
      </View>
    );
  }

  renderScrollBar() {
    const {height, style, useGradientFinish} = this.getThemeProps();
    let backgroundColor;
    let sizeStyle;
    let otherStyle;
    const flatten = StyleSheet.flatten(style);
    if (flatten) {
      backgroundColor = flatten.backgroundColor;
      sizeStyle = _.pick(flatten, ['width', 'height']);
      otherStyle = _.omit(flatten, ['width', 'height']);
    }
    const gradientColor = backgroundColor || Colors.white;

    return (
      <View row style={{opacity: this.state.fadeAnim, height}} useSafeArea>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={this.onLayout}
          onContentSizeChange={this.onContentSizeChange}
          onScroll={this.onScroll}
          style={sizeStyle}
        >
          <View style={[this.styles.container, otherStyle]} bg-white row>
            {this.renderChildren()}
            {this.hasMeasurements() && this.renderSelectedIndicator()}
          </View>
        </ScrollView>
        {useGradientFinish && this.renderGradient(height, gradientColor)}
      </View>
    );
  }

  renderGradient(height, tintColor) {
    const gradientWidth = 28;
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          width: gradientWidth,
          height: height - 2,
          position: 'absolute',
          left: this.containerWidth - gradientWidth,
          opacity: this.state.gradientValue}}
      >
        <Image source={Assets.images.gradient} style={{width: gradientWidth, height: height - 3, tintColor}}/>
      </Animated.View>
    );
  }

  render() {
    switch (this.state.currentMode) {
      case LAYOUT_MODES.FIT:
        return (
          this.renderBar()
        );
      case LAYOUT_MODES.SCROLL:
        return (
          this.renderScrollBar()
        );
      default: break;
    }
  }

  /** Render Events */

  onLayout = (event) => {
    this.containerWidth = event.nativeEvent.layout.width;

    switch (this.state.currentMode) {
      case LAYOUT_MODES.FIT:
        this.contentWidth = this.containerWidth;
        this.updateIndicatorPosition();
        break;
      case LAYOUT_MODES.SCROLL:
        this.calcLayoutMode();
        break;
      default: break;
    }
  }

  onContentSizeChange = (width) => {
    this.contentWidth = width;    
    this.calcLayoutMode();
  }

  calcLayoutMode() {
    if (this.contentWidth && this.containerWidth) {
      if (this.contentWidth < this.containerWidth) {
        // clean and change to FIT layout
        this.contentWidth = this.containerWidth;
        this.itemsWidths = {};
        this.setState({currentMode: LAYOUT_MODES.FIT});
      } else {
        // display SCROLL layout
        this.updateIndicatorPosition();
        if (this.state.fadeAnim === 0) {
          this.setState({fadeAnim: 1});
        }
      }
    }
  }

  onScroll = (event) => {
    const {useGradientFinish} = this.getThemeProps();
    if (useGradientFinish) {
      const x = event.nativeEvent.contentOffset.x;
      this.animateGradientOpacity(x);
    }
  }

  animateGradientOpacity = (x) => {
    const overflow = this.contentWidth - this.containerWidth;
    const newValue = (x > 0 && x >= overflow - 1) ? 0 : 1;
  
    Animated.spring(this.state.gradientValue, {
      toValue: newValue,
      speed: 20,
    }).start();
  }
}

function createStyles() {
  return StyleSheet.create({
    container: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.dark70,
    },
    selectedIndicator: {
      borderBottomWidth: 1.5,
      borderColor: Colors.blue30,
    },
    absoluteContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
    },
    linearGradient: {
      flex: 1,
    },
  });
}

TabBar.Item = TabBarItem;
