/**
 * ADWOL site front-end behaviour: mobile nav toggle, sticky header,
 * scroll-reveal, stat count-up, project filters, and the contact form
 * (submits to Web3Forms, falls back to mailto if that request fails).
 */
( function () {
    'use strict';

    var reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

    document.addEventListener( 'DOMContentLoaded', function () {
        initMobileNav();
        initStickyHeader();
        initCountUp();
        initScrollReveal();
        initContactForm();
        initProjectFilter();
    } );

    function initMobileNav() {
        var toggle = document.querySelector( '.menu-toggle' );
        var nav = document.getElementById( 'primary-menu' );
        if ( ! toggle || ! nav ) { return; }

        toggle.addEventListener( 'click', function () {
            var isOpen = nav.classList.toggle( 'is-open' );
            toggle.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );
        } );

        nav.addEventListener( 'click', function ( event ) {
            if ( 'A' === event.target.tagName && nav.classList.contains( 'is-open' ) ) {
                nav.classList.remove( 'is-open' );
                toggle.setAttribute( 'aria-expanded', 'false' );
            }
        } );
    }

    function initStickyHeader() {
        var header = document.querySelector( '.site-header' );
        if ( ! header ) { return; }
        var apply = function () {
            header.classList.toggle( 'is-scrolled', window.scrollY > 40 );
        };
        apply();
        window.addEventListener( 'scroll', apply, { passive: true } );
    }

    function initCountUp() {
        var nodes = document.querySelectorAll( '.number[data-count]' );
        if ( ! nodes.length ) { return; }

        nodes.forEach( function ( el ) {
            var target = parseInt( el.getAttribute( 'data-count' ), 10 );
            var suffix = el.querySelector( '.suffix' );
            var suffixHtml = suffix ? suffix.outerHTML : '';

            if ( reduceMotion ) {
                el.innerHTML = target + suffixHtml;
                return;
            }

            var start = null;
            var dur = 1100;
            function step( ts ) {
                if ( ! start ) { start = ts; }
                var p = Math.min( ( ts - start ) / dur, 1 );
                var val = Math.round( target * ( 1 - Math.pow( 1 - p, 3 ) ) );
                el.innerHTML = val + suffixHtml;
                if ( p < 1 ) { requestAnimationFrame( step ); }
            }
            requestAnimationFrame( step );
        } );
    }

    function initScrollReveal() {
        var items = document.querySelectorAll( '.reveal' );
        if ( ! items.length ) { return; }

        if ( reduceMotion || ! ( 'IntersectionObserver' in window ) ) {
            return;
        }

        items.forEach( function ( el ) { el.classList.add( 'armed' ); } );

        var io = new IntersectionObserver( function ( entries ) {
            entries.forEach( function ( entry ) {
                if ( entry.isIntersecting ) {
                    entry.target.classList.add( 'in' );
                    io.unobserve( entry.target );
                }
            } );
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' } );

        items.forEach( function ( el ) { io.observe( el ); } );
    }

    function initProjectFilter() {
        var filterBar = document.querySelector( '.sector-filter' );
        var rows = document.querySelectorAll( '.project-row' );
        if ( ! filterBar || ! rows.length ) { return; }

        var buttons = filterBar.querySelectorAll( '.filter-btn' );
        var emptyState = document.querySelector( '.project-list .empty-state' );

        // Counts are derived from the rows themselves, so they can never drift
        // out of sync with the list.
        buttons.forEach( function ( btn ) {
            var filter = btn.getAttribute( 'data-filter' );
            var countEl = btn.querySelector( '.count' );
            if ( ! countEl ) { return; }

            var count = 0;
            rows.forEach( function ( row ) {
                if ( 'all' === filter || row.getAttribute( 'data-sector' ) === filter ) {
                    count++;
                }
            } );
            countEl.textContent = count;
        } );

        buttons.forEach( function ( btn ) {
            btn.addEventListener( 'click', function () {
                var filter = btn.getAttribute( 'data-filter' );

                buttons.forEach( function ( b ) {
                    var isActive = b === btn;
                    b.classList.toggle( 'is-active', isActive );
                    b.setAttribute( 'aria-pressed', isActive ? 'true' : 'false' );
                } );

                var visible = 0;
                rows.forEach( function ( row ) {
                    var match = 'all' === filter || row.getAttribute( 'data-sector' ) === filter;
                    row.hidden = ! match;
                    if ( match ) { visible++; }
                } );

                if ( emptyState ) {
                    emptyState.classList.toggle( 'is-visible', 0 === visible );
                }
            } );
        } );
    }

    function initContactForm() {
        var form = document.getElementById( 'adwol-contact-form' );
        if ( ! form ) { return; }

        form.addEventListener( 'submit', function ( event ) {
            event.preventDefault();

            var honeypot = form.querySelector( '[name="adwol_website"]' );
            var notice = document.getElementById( 'form-notice' );
            var submitBtn = form.querySelector( 'button[type="submit"]' );

            var name = form.adwol_name.value.trim();
            var email = form.adwol_email.value.trim();
            var phone = form.adwol_phone.value.trim();
            var subject = form.adwol_subject.value.trim();
            var message = form.adwol_message.value.trim();

            clearErrors( form );

            var errors = {};
            if ( ! name ) {
                errors.adwol_name = 'Please tell us your name.';
            }
            if ( ! email ) {
                errors.adwol_email = 'Please provide an email address.';
            } else if ( ! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( email ) ) {
                errors.adwol_email = 'That email address does not look right.';
            }
            if ( ! message ) {
                errors.adwol_message = 'Please tell us about your project or enquiry.';
            } else if ( message.length < 10 ) {
                errors.adwol_message = 'Please give us a little more detail.';
            }

            var hasErrors = Object.keys( errors ).length > 0;

            if ( hasErrors ) {
                showErrors( form, errors );
                if ( notice ) {
                    notice.textContent = 'Please check the highlighted fields below.';
                    notice.className = 'form-notice error';
                    notice.hidden = false;
                }
                return;
            }

            if ( honeypot && honeypot.value.trim() !== '' ) {
                form.reset();
                return;
            }

            var recipient = form.getAttribute( 'data-recipient' ) || 'adwolinvestments@gmail.com';
            var mailSubject = subject || 'Website enquiry from ' + name;

            var fallbackToMailto = function () {
                var bodyLines = [
                    'Name: ' + name,
                    'Email: ' + email,
                    'Phone: ' + ( phone || '(not supplied)' ),
                    '',
                    message
                ];
                var mailtoUrl = 'mailto:' + encodeURIComponent( recipient )
                    + '?subject=' + encodeURIComponent( mailSubject )
                    + '&body=' + encodeURIComponent( bodyLines.join( '\n' ) );
                window.location.href = mailtoUrl;
                if ( notice ) {
                    notice.textContent = 'We could not reach our server, so your email app should now be open with the message pre-filled instead — just hit send. If nothing opened, email us directly at ' + recipient + '.';
                    notice.className = 'form-notice error';
                    notice.hidden = false;
                }
            };

            if ( submitBtn ) { submitBtn.disabled = true; }

            fetch( 'https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify( {
                    access_key: form.querySelector( '[name="access_key"]' ).value,
                    subject: mailSubject,
                    from_name: name,
                    replyto: email,
                    name: name,
                    email: email,
                    phone: phone || '(not supplied)',
                    message: message
                } )
            } ).then( function ( response ) {
                return response.json().then( function ( data ) {
                    return { ok: response.ok && data.success, data: data };
                } );
            } ).then( function ( result ) {
                if ( submitBtn ) { submitBtn.disabled = false; }
                if ( result.ok ) {
                    form.reset();
                    if ( notice ) {
                        notice.textContent = 'Thank you — your enquiry has been sent. A member of the ADWOL team will be in touch shortly.';
                        notice.className = 'form-notice success';
                        notice.hidden = false;
                    }
                } else {
                    fallbackToMailto();
                }
            } ).catch( function () {
                if ( submitBtn ) { submitBtn.disabled = false; }
                fallbackToMailto();
            } );
        } );
    }

    function clearErrors( form ) {
        form.querySelectorAll( '.field-error' ).forEach( function ( el ) { el.remove(); } );
        form.querySelectorAll( '.has-error' ).forEach( function ( el ) { el.classList.remove( 'has-error' ); } );
    }

    function showErrors( form, errors ) {
        Object.keys( errors ).forEach( function ( fieldName ) {
            var field = form.elements[ fieldName ];
            if ( ! field ) { return; }
            field.classList.add( 'has-error' );
            var span = document.createElement( 'span' );
            span.className = 'field-error';
            span.textContent = errors[ fieldName ];
            field.insertAdjacentElement( 'afterend', span );
        } );
    }
} )();
